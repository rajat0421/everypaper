import { useEffect, useRef, useState, type RefObject } from "react";
import { CanvasEngine, type Stroke, type TileData } from "@everypaper/canvas-core";
import {
  SOCKET_EVENTS,
  boundsFromPoints,
  tileIdOf,
  tilesForBounds,
  worldToTile,
  type Point,
  type StrokeDto,
  type TextDto
} from "@everypaper/shared";
import { socketService, type TextCreatePayload } from "../services/socket";
import { api } from "../services/api";
import { offlineDb } from "../lib/offlineDb";
import { diffTileSubscriptions } from "../lib/tileSubscription";
import { strokeDtoToStroke, textDtoToTextItem } from "../lib/dto";
import { useConnectionStore } from "../stores/connectionStore";
import { useToolStore } from "../stores/toolStore";
import { useTextEditorStore } from "../stores/textEditorStore";
import { parseShareParams } from "../lib/shareLink";

const TILE_SUBSCRIBE_DEBOUNCE_MS = 150;
const TEXT_ERASE_RADIUS_PX = 24;

interface StrokeStartedPayload {
  sessionId: string;
  clientStrokeId: string;
  color: string;
  brushSize: number;
  isEraser: boolean;
  startPoint: Point;
}

interface StrokePointsRelayedPayload {
  sessionId: string;
  clientStrokeId: string;
  points: Point[];
}

interface CanvasSyncPayload {
  tileId?: string;
  strokes?: StrokeDto[];
  texts?: TextDto[];
}

/**
 * Creates and owns the CanvasEngine instance for its lifetime, and wires it
 * up to the socket/REST backend. All backend calls are written defensively:
 * if the API is unreachable, tile loads resolve to an empty tile (or a
 * locally cached one) instead of throwing, so the canvas always renders.
 */
export function useCanvasEngine(
  canvasRef: RefObject<HTMLCanvasElement>,
  sessionId: string | undefined
): CanvasEngine | null {
  const [engine, setEngine] = useState<CanvasEngine | null>(null);

  const subscribedTilesRef = useRef<Set<string>>(new Set());
  const subscribeTimerRef = useRef<number | null>(null);
  const pendingVisibleIdsRef = useRef<string[]>([]);
  const seqCounters = useRef<Map<string, number>>(new Map());
  const myStrokes = useRef<Map<string, Stroke>>(new Map());
  const remoteActiveStrokes = useRef<Map<string, Stroke>>(new Map());
  const appliedSyncIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sessionId) return;

    // `let` (not `const`) is intentional: `eraseTextNear` below closes over
    // `canvasEngine` before it's assigned, and is only ever invoked later,
    // after the CanvasEngine is constructed and this is set.
    // eslint-disable-next-line prefer-const
    let canvasEngine: CanvasEngine;

    const fetchTile = async (tileId: string): Promise<TileData> => {
      const [txStr, tyStr] = tileId.split(":");
      const tx = Number(txStr);
      const ty = Number(tyStr);
      try {
        const res = await api.getTile(tx, ty);
        const data: TileData = {
          tileId: res.tileId,
          strokes: res.strokes.map(strokeDtoToStroke),
          texts: res.texts.map(textDtoToTextItem),
          loadedAt: Date.now()
        };
        void offlineDb.cacheTile(tileId, data);
        return data;
      } catch {
        const cached = await offlineDb.getCachedTile<TileData>(tileId);
        if (cached) return cached;
        return { tileId, strokes: [], texts: [], loadedAt: Date.now() };
      }
    };

    const eraseTextNear = (point: Point) => {
      const tileId = tileIdOf(worldToTile(point.x, point.y));
      const texts = canvasEngine.tileManager.getTextsForTile(tileId);
      for (const text of texts) {
        if (text.sessionId !== sessionId) continue;
        const approxWidth = Math.max(text.fontSize, text.content.length * text.fontSize * 0.55);
        const approxHeight = text.fontSize * 1.3;
        const withinX =
          point.x >= text.x - TEXT_ERASE_RADIUS_PX && point.x <= text.x + approxWidth + TEXT_ERASE_RADIUS_PX;
        const withinY =
          point.y >= text.y - approxHeight - TEXT_ERASE_RADIUS_PX && point.y <= text.y + TEXT_ERASE_RADIUS_PX;
        if (withinX && withinY) {
          canvasEngine.applyRemoteTextDelete(text.id);
          socketService.textDelete({ textId: text.id });
          void offlineDb.removePendingOp(text.id);
          break;
        }
      }
    };

    canvasEngine = new CanvasEngine({
      canvas,
      sessionId,
      fetchTile,
      callbacks: {
        onStrokeStart: (stroke, style) => {
          const startPoint = stroke.points[0];
          if (!startPoint) return;
          socketService.strokeStart({
            clientStrokeId: stroke.clientStrokeId,
            color: style.color,
            brushSize: style.brushSize,
            isEraser: stroke.isEraser,
            startPoint
          });
          if (stroke.isEraser) eraseTextNear(startPoint);
        },
        onStrokePoints: (clientStrokeId, points) => {
          const seq = seqCounters.current.get(clientStrokeId) ?? 0;
          socketService.strokePoints({ clientStrokeId, seq, points });
          seqCounters.current.set(clientStrokeId, seq + 1);
          if (useToolStore.getState().tool === "eraser") {
            for (const point of points) eraseTextNear(point);
          }
        },
        onStrokeEnd: (stroke) => {
          myStrokes.current.set(stroke.id, stroke);
          seqCounters.current.delete(stroke.id);
          socketService.strokeEnd({ clientStrokeId: stroke.id });
          void offlineDb.addPendingOp({
            id: stroke.id,
            kind: "strokeEnd",
            payload: { clientStrokeId: stroke.id },
            createdAt: Date.now()
          });
        },
        onUndoStroke: (strokeId) => {
          canvasEngine.applyRemoteStrokeDelete(strokeId);
          socketService.strokeDelete({ strokeId });
          void offlineDb.removePendingOp(strokeId);
        },
        onRedoStroke: (strokeId) => {
          const stroke = myStrokes.current.get(strokeId);
          if (!stroke) return;
          canvasEngine.applyRemoteStroke(stroke);
          // Best-effort re-persist via the REST fallback path. There is no
          // dedicated "restore" wire event in the realtime protocol, and the
          // exact POST /strokes body shape is the API's contract to define;
          // this never blocks the local redo if it fails.
          api.createStroke(stroke).catch(() => undefined);
        },
        onTextToolTap: (worldX, worldY) => {
          const screen = canvasEngine.viewport.getCoordinateSystem().worldToScreen(worldX, worldY);
          useTextEditorStore.getState().openAt(screen.x, screen.y, worldX, worldY);
        },
        onVisibleTilesChanged: (tileIds) => {
          pendingVisibleIdsRef.current = tileIds;
          if (subscribeTimerRef.current !== null) {
            window.clearTimeout(subscribeTimerRef.current);
          }
          subscribeTimerRef.current = window.setTimeout(() => {
            const diff = diffTileSubscriptions(subscribedTilesRef.current, pendingVisibleIdsRef.current);
            socketService.subscribeTiles(diff.toSubscribe);
            socketService.unsubscribeTiles(diff.toUnsubscribe);
            subscribedTilesRef.current = new Set(pendingVisibleIdsRef.current);
          }, TILE_SUBSCRIBE_DEBOUNCE_MS);
        }
      }
    });

    setEngine(canvasEngine);
    canvasEngine.start();

    const shareParams = parseShareParams(window.location.search);
    if (shareParams) {
      canvasEngine.panTo(shareParams.x ?? 0, shareParams.y ?? 0, shareParams.zoom);
    }

    // --- socket wiring ---
    const socket = socketService.connect();
    const unsubscribeStatus = socketService.onStatusChange(useConnectionStore.getState().setSocketStatus);

    const flushPendingOps = async () => {
      const ops = await offlineDb.getAllPendingOps();
      for (const op of ops) {
        if (op.kind === "strokeEnd") {
          socketService.strokeEnd(op.payload as { clientStrokeId: string });
        } else if (op.kind === "textCreate") {
          socketService.textCreate(op.payload as TextCreatePayload);
        } else if (op.kind === "textDelete") {
          socketService.textDelete(op.payload as { textId: string });
        }
      }
    };

    const handleConnect = () => {
      socketService.subscribeTiles([...subscribedTilesRef.current]);
      void flushPendingOps();
    };
    socket.on("connect", handleConnect);

    const applySyncItem = (item: CanvasSyncPayload | null | undefined) => {
      if (!item) return;
      for (const raw of item.strokes ?? []) {
        try {
          const stroke = strokeDtoToStroke(raw);
          const key = `stroke:${stroke.id}`;
          if (appliedSyncIds.current.has(key)) continue;
          appliedSyncIds.current.add(key);
          canvasEngine.applyRemoteStroke(stroke);
        } catch {
          // skip malformed entries rather than crashing the sync handler
        }
      }
      for (const raw of item.texts ?? []) {
        try {
          const text = textDtoToTextItem(raw);
          const key = `text:${text.id}`;
          if (appliedSyncIds.current.has(key)) continue;
          appliedSyncIds.current.add(key);
          const tileId = item.tileId ?? tileIdOf(worldToTile(text.x, text.y));
          canvasEngine.applyRemoteText(text, tileId);
        } catch {
          // skip malformed entries
        }
      }
    };

    const handleCanvasSync = (payload: CanvasSyncPayload | CanvasSyncPayload[]) => {
      if (Array.isArray(payload)) {
        for (const item of payload) applySyncItem(item);
      } else {
        applySyncItem(payload);
      }
    };
    socket.on(SOCKET_EVENTS.CANVAS_SYNC, handleCanvasSync);

    const handleStrokeStarted = (payload: StrokeStartedPayload) => {
      if (payload.sessionId === sessionId) return;
      const key = `${payload.sessionId}:${payload.clientStrokeId}`;
      const bounds = boundsFromPoints([payload.startPoint], payload.brushSize);
      const stroke: Stroke = {
        id: key,
        sessionId: payload.sessionId,
        points: [payload.startPoint],
        color: payload.color,
        brushSize: payload.brushSize,
        isEraser: payload.isEraser,
        bounds,
        tileIds: tilesForBounds(bounds),
        createdAt: Date.now(),
        pending: true
      };
      remoteActiveStrokes.current.set(key, stroke);
      canvasEngine.applyRemoteStroke(stroke);
    };
    socket.on(SOCKET_EVENTS.STROKE_STARTED, handleStrokeStarted);

    const handleStrokePointsRelayed = (payload: StrokePointsRelayedPayload) => {
      if (payload.sessionId === sessionId) return;
      const key = `${payload.sessionId}:${payload.clientStrokeId}`;
      const existing = remoteActiveStrokes.current.get(key);
      if (!existing) return;
      const points = [...existing.points, ...payload.points];
      const bounds = boundsFromPoints(points, existing.brushSize);
      const updated: Stroke = { ...existing, points, bounds, tileIds: tilesForBounds(bounds) };
      remoteActiveStrokes.current.set(key, updated);
      canvasEngine.applyRemoteStroke(updated);
    };
    socket.on(SOCKET_EVENTS.STROKE_POINTS_RELAYED, handleStrokePointsRelayed);

    const handleStrokeCompleted = (dto: StrokeDto) => {
      try {
        const stroke = strokeDtoToStroke(dto);
        canvasEngine.applyRemoteStroke(stroke);

        // The server assigns its own `id`, distinct from the clientStrokeId this
        // stroke was drawn and tracked under locally (undo stack, myStrokes map,
        // offline queue). Without reconciling ids here, undo silently stops
        // working for any stroke as soon as it finishes syncing.
        const localId = dto.clientStrokeId;
        if (localId && localId !== dto.id) {
          canvasEngine.drawing.remapStrokeId(localId, dto.id);
          const existingLocal = myStrokes.current.get(localId);
          if (existingLocal) {
            myStrokes.current.delete(localId);
            myStrokes.current.set(dto.id, { ...existingLocal, id: dto.id });
          }
        }
        void offlineDb.removePendingOp(localId ?? stroke.id);

        for (const key of [...remoteActiveStrokes.current.keys()]) {
          if (key.endsWith(`:${dto.id}`)) remoteActiveStrokes.current.delete(key);
        }
      } catch {
        // ignore malformed payloads from a backend that's still under development
      }
    };
    socket.on(SOCKET_EVENTS.STROKE_COMPLETED, handleStrokeCompleted);

    const handleStrokeDeleted = (payload: { strokeId: string }) => {
      canvasEngine.applyRemoteStrokeDelete(payload.strokeId);
    };
    socket.on(SOCKET_EVENTS.STROKE_DELETED, handleStrokeDeleted);

    const handleTextCreated = (dto: TextDto & { tileId?: string }) => {
      try {
        const text = textDtoToTextItem(dto);
        const tileId = dto.tileId ?? tileIdOf(worldToTile(text.x, text.y));
        canvasEngine.applyRemoteText(text, tileId);
        void offlineDb.removePendingOp(text.id);
      } catch {
        // ignore malformed payloads
      }
    };
    socket.on(SOCKET_EVENTS.TEXT_CREATED, handleTextCreated);

    const handleTextDeleted = (payload: { textId: string }) => {
      canvasEngine.applyRemoteTextDelete(payload.textId);
      void offlineDb.removePendingOp(payload.textId);
    };
    socket.on(SOCKET_EVENTS.TEXT_DELETED, handleTextDeleted);

    const handlePresenceUpdate = (payload: { count?: number }) => {
      if (typeof payload?.count === "number") {
        useConnectionStore.getState().setPresenceCount(payload.count);
      }
    };
    socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, handlePresenceUpdate);

    return () => {
      if (subscribeTimerRef.current !== null) window.clearTimeout(subscribeTimerRef.current);
      socket.off("connect", handleConnect);
      socket.off(SOCKET_EVENTS.CANVAS_SYNC, handleCanvasSync);
      socket.off(SOCKET_EVENTS.STROKE_STARTED, handleStrokeStarted);
      socket.off(SOCKET_EVENTS.STROKE_POINTS_RELAYED, handleStrokePointsRelayed);
      socket.off(SOCKET_EVENTS.STROKE_COMPLETED, handleStrokeCompleted);
      socket.off(SOCKET_EVENTS.STROKE_DELETED, handleStrokeDeleted);
      socket.off(SOCKET_EVENTS.TEXT_CREATED, handleTextCreated);
      socket.off(SOCKET_EVENTS.TEXT_DELETED, handleTextDeleted);
      socket.off(SOCKET_EVENTS.PRESENCE_UPDATE, handlePresenceUpdate);
      unsubscribeStatus();
      canvasEngine.destroy();
      socketService.disconnect();
      setEngine(null);
    };
  }, [sessionId, canvasRef]);

  return engine;
}

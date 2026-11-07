import { TILE_SIZE } from "@everypaper/shared";
import { FrameScheduler } from "./frameScheduler.js";
import { GestureController } from "./input/gestureController.js";
import { PointerHandler, type PointerPoint } from "./input/pointerHandler.js";
import { TouchHandler } from "./input/touchHandler.js";
import { Renderer } from "./renderer.js";
import { TileManager } from "./tileManager.js";
import { Viewport } from "./viewport.js";
import { VisibleTileCalculator } from "./visibleTileCalculator.js";
import { DrawingController, type DrawingControllerCallbacks, type Tool } from "./drawingController.js";
import type { ScreenSize, Stroke, TextItem, TileFetcher } from "./types.js";

export interface CanvasEngineOptions {
  canvas: HTMLCanvasElement;
  sessionId: string;
  fetchTile: TileFetcher;
  /** Must match the page's actual CSS background color behind the canvas — see Renderer.render(). */
  backgroundColor?: string;
  callbacks?: DrawingControllerCallbacks & {
    onTextToolTap?: (worldX: number, worldY: number) => void;
    onVisibleTilesChanged?: (tileIds: string[]) => void;
  };
}

/**
 * Top-level, framework-independent orchestrator: owns the viewport, tile
 * loading, rendering loop and input handling. React only talks to this class
 * through its public methods and callbacks — it never touches the canvas
 * directly.
 */
export class CanvasEngine {
  readonly viewport: Viewport;
  readonly tileManager: TileManager;
  readonly drawing: DrawingController;
  private renderer = new Renderer();
  private scheduler: FrameScheduler;
  private pointerHandler: PointerHandler;
  private gestureController: GestureController;
  private touchHandler = new TouchHandler();
  private tileCalculator = new VisibleTileCalculator();
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private currentTileIds: string[] = [];
  private panPointerId: number | null = null;
  private lastPanPoint: { x: number; y: number } | null = null;
  private resizeObserver?: ResizeObserver;

  constructor(private options: CanvasEngineOptions) {
    this.canvas = options.canvas;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;

    this.viewport = new Viewport();
    this.tileManager = new TileManager(options.fetchTile);
    this.drawing = new DrawingController(options.sessionId, options.callbacks);
    this.scheduler = new FrameScheduler(() => this.draw());

    this.pointerHandler = new PointerHandler(this.canvas, {
      onDown: (p) => this.handlePointerDown(p),
      onMove: (p) => this.handlePointerMove(p),
      onUp: (p) => this.handlePointerUp(p),
      onCancel: () => this.handlePointerCancel(),
      onWheel: (evt) => this.handleWheel(evt)
    });

    this.gestureController = new GestureController({
      onPinchZoom: (cx, cy, factor) => {
        this.viewport.zoomAtScreenPoint(cx, cy, factor);
        this.requestFrame();
      }
    });

    this.tileManager.onTileLoaded(() => this.requestFrame());
    this.viewport.subscribe(() => {
      this.updateVisibleTiles();
      this.requestFrame();
    });
  }

  start(): void {
    this.pointerHandler.attach();
    this.resize();
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.canvas);
    }
    this.updateVisibleTiles();
    this.requestFrame();
  }

  destroy(): void {
    this.pointerHandler.detach();
    this.resizeObserver?.disconnect();
    this.scheduler.cancel();
  }

  resize(): void {
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const screen: ScreenSize = { width, height, dpr };
    this.viewport.setScreen(screen);
    this.updateVisibleTiles();
    this.requestFrame();
  }

  setTool(tool: Tool): void {
    this.drawing.setTool(tool);
  }

  panTo(worldX: number, worldY: number, zoom?: number): void {
    this.viewport.panToWorld(worldX, worldY);
    if (zoom !== undefined) this.viewport.setZoom(zoom);
  }

  resetView(): void {
    this.viewport.reset();
  }

  /** Called by the app layer once a server-confirmed stroke/text arrives, to merge it into tile data. */
  applyRemoteStroke(stroke: Stroke): void {
    this.tileManager.applyStrokeUpserted(stroke);
    this.requestFrame();
  }

  applyRemoteStrokeDelete(strokeId: string): void {
    this.tileManager.applyStrokeDeleted(strokeId);
    this.requestFrame();
  }

  applyRemoteText(text: TextItem, tileId: string): void {
    this.tileManager.applyTextUpserted(text, tileId);
    this.requestFrame();
  }

  applyRemoteTextDelete(textId: string): void {
    this.tileManager.applyTextDeleted(textId);
    this.requestFrame();
  }

  requestFrame(): void {
    this.scheduler.schedule();
  }

  private updateVisibleTiles(): void {
    const bounds = this.viewport.visibleWorldBounds();
    void this.tileManager.ensureVisible(bounds, 1);
    const ids = this.tileCalculator.withPrefetch(bounds, 1);
    this.currentTileIds = ids;
    this.options.callbacks?.onVisibleTilesChanged?.(ids);
  }

  private draw(): void {
    const coords = this.viewport.getCoordinateSystem();
    this.renderer.render(
      this.ctx,
      coords,
      this.currentTileIds,
      (tileId) => ({
        strokes: this.tileManager.getStrokesForTile(tileId),
        texts: this.tileManager.getTextsForTile(tileId)
      }),
      [...this.tileManager.getLocalStrokes(), ...(this.drawing.getActiveStroke() ? [this.activeStrokeAsStroke()!] : [])],
      this.tileManager.getLocalTexts(),
      this.options.backgroundColor
    );
  }

  private activeStrokeAsStroke(): Stroke | null {
    const active = this.drawing.getActiveStroke();
    if (!active) return null;
    const style = this.drawing.getStyle();
    return {
      id: active.clientStrokeId,
      sessionId: this.options.sessionId,
      points: active.points,
      color: style.color,
      brushSize: style.brushSize,
      isEraser: active.isEraser,
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      tileIds: [],
      createdAt: Date.now(),
      pending: true
    };
  }

  private handlePointerDown(p: PointerPoint): void {
    const pointers = this.pointerHandler.getActivePointers();
    if (pointers.length >= 2) {
      this.drawing.cancelStroke();
      this.gestureController.reset();
      return;
    }
    if (p.pointerType === "touch") this.touchHandler.record(p);

    if (this.drawing.getTool() === "text") {
      const world = this.viewport.getCoordinateSystem().screenToWorld(p.x, p.y);
      this.options.callbacks?.onTextToolTap?.(world.x, world.y);
      return;
    }

    if (this.drawing.isDrawingTool()) {
      const world = this.viewport.getCoordinateSystem().screenToWorld(p.x, p.y);
      this.drawing.beginStroke({ x: world.x, y: world.y, t: Date.now(), p: p.pressure });
      this.requestFrame();
      return;
    }

    // pan tool
    this.panPointerId = p.pointerId;
    this.lastPanPoint = { x: p.x, y: p.y };
  }

  private handlePointerMove(p: PointerPoint): void {
    const pointers = this.pointerHandler.getActivePointers();
    if (pointers.length >= 2) {
      this.gestureController.update(pointers);
      return;
    }

    if (p.pointerType === "touch") this.touchHandler.record(p);

    if (this.drawing.getActiveStroke()) {
      const world = this.viewport.getCoordinateSystem().screenToWorld(p.x, p.y);
      this.drawing.addPoint({ x: world.x, y: world.y, t: Date.now(), p: p.pressure });
      this.requestFrame();
      return;
    }

    if (this.panPointerId === p.pointerId && this.lastPanPoint) {
      const dx = p.x - this.lastPanPoint.x;
      const dy = p.y - this.lastPanPoint.y;
      this.viewport.pan(dx, dy);
      this.lastPanPoint = { x: p.x, y: p.y };
    }
  }

  private handlePointerUp(p: PointerPoint): void {
    if (this.drawing.getActiveStroke()?.clientStrokeId) {
      const stroke = this.drawing.endStroke();
      if (stroke) {
        this.tileManager.addLocalStroke(stroke);
      }
      this.requestFrame();
    }
    if (this.panPointerId === p.pointerId) {
      this.panPointerId = null;
      this.lastPanPoint = null;
    }
    this.gestureController.reset();
    this.touchHandler.reset();
  }

  private handlePointerCancel(): void {
    this.drawing.cancelStroke();
    this.panPointerId = null;
    this.lastPanPoint = null;
    this.gestureController.reset();
  }

  private handleWheel(evt: WheelEvent): void {
    // Trackpad pinch-to-zoom is synthesized by the browser as `wheel` + ctrlKey,
    // and an explicit Cmd/Ctrl+scroll is the conventional "zoom" modifier.
    // Plain two-finger trackpad scrolling (no ctrlKey) must pan, not zoom —
    // otherwise every scroll gesture zooms the canvas instead of panning it.
    if (evt.ctrlKey || evt.metaKey) {
      const rect = this.canvas.getBoundingClientRect();
      const x = evt.clientX - rect.left;
      const y = evt.clientY - rect.top;
      const factor = Math.exp(-evt.deltaY * 0.001);
      this.viewport.zoomAtScreenPoint(x, y, factor);
    } else {
      this.viewport.pan(-evt.deltaX, -evt.deltaY);
    }
    this.requestFrame();
  }
}

export { TILE_SIZE };

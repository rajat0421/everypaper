import type { Server } from "socket.io";
import { ZodError } from "zod";
import {
  strokeStartSchema,
  strokePointsSchema,
  strokeEndSchema,
  strokeDeleteSchema,
  SOCKET_EVENTS
} from "@everypaper/shared";
import type { AppSocket } from "../types.js";
import type { InFlightStrokeTracker } from "../services/in-flight-strokes.js";
import type { SlidingWindowRateLimiter } from "../services/rate-limiter.js";
import { tileRoomName, tileRoomsForPoint, tileRoomsForPoints } from "../rooms/tile-rooms.js";
import { createStroke, getStrokeById, softDeleteStroke, toStrokeDto } from "../../modules/strokes/stroke.service.js";
import { HttpError } from "../../utils/http-error.js";
import { logger } from "../../infrastructure/logger.js";

function emitError(socket: AppSocket, code: string, message: string): void {
  socket.emit(SOCKET_EVENTS.ERROR, { code, message });
}

export function registerStrokeHandlers(
  io: Server,
  socket: AppSocket,
  inFlight: InFlightStrokeTracker,
  strokeStartLimiter: SlidingWindowRateLimiter
): void {
  const sessionId = socket.data.session.id;

  socket.on(SOCKET_EVENTS.STROKE_START, (payload: unknown) => {
    try {
      const input = strokeStartSchema.parse(payload);

      if (!strokeStartLimiter.tryConsume(sessionId)) {
        emitError(socket, "RATE_LIMITED", "Too many strokes started, slow down");
        return;
      }

      const rooms = new Set(tileRoomsForPoint(input.startPoint.x, input.startPoint.y));
      inFlight.start({
        clientStrokeId: input.clientStrokeId,
        sessionId,
        socketId: socket.id,
        color: input.color,
        brushSize: input.brushSize,
        isEraser: input.isEraser ?? false,
        points: [input.startPoint],
        rooms,
        lastSeq: -1
      });

      for (const room of rooms) {
        io.to(room).emit(SOCKET_EVENTS.STROKE_STARTED, {
          clientStrokeId: input.clientStrokeId,
          sessionId,
          color: input.color,
          brushSize: input.brushSize,
          isEraser: input.isEraser ?? false,
          startPoint: input.startPoint
        });
      }
    } catch (err) {
      if (err instanceof ZodError) {
        emitError(socket, "VALIDATION_ERROR", err.message);
        return;
      }
      logger.error({ err }, "stroke:start failed");
      emitError(socket, "INTERNAL_ERROR", "Failed to start stroke");
    }
  });

  socket.on(SOCKET_EVENTS.STROKE_POINTS, (payload: unknown) => {
    try {
      const input = strokePointsSchema.parse(payload);
      const stroke = inFlight.get(input.clientStrokeId);
      if (!stroke) {
        emitError(socket, "NOT_FOUND", "Unknown in-flight stroke");
        return;
      }
      if (stroke.sessionId !== sessionId) {
        emitError(socket, "FORBIDDEN", "You do not own this stroke");
        return;
      }
      if (input.seq <= stroke.lastSeq) {
        // Duplicate/out-of-order batch, drop silently.
        return;
      }
      stroke.lastSeq = input.seq;
      stroke.points.push(...input.points);

      const newRooms = tileRoomsForPoints(input.points);
      for (const room of newRooms) {
        if (!stroke.rooms.has(room)) {
          stroke.rooms.add(room);
        }
      }

      for (const room of stroke.rooms) {
        io.to(room).emit(SOCKET_EVENTS.STROKE_POINTS_RELAYED, {
          clientStrokeId: input.clientStrokeId,
          seq: input.seq,
          points: input.points
        });
      }
    } catch (err) {
      if (err instanceof ZodError) {
        emitError(socket, "VALIDATION_ERROR", err.message);
        return;
      }
      logger.error({ err }, "stroke:points failed");
      emitError(socket, "INTERNAL_ERROR", "Failed to relay stroke points");
    }
  });

  socket.on(SOCKET_EVENTS.STROKE_END, (payload: unknown) => {
    void (async () => {
      try {
        const input = strokeEndSchema.parse(payload);
        const stroke = inFlight.get(input.clientStrokeId);
        if (!stroke) {
          emitError(socket, "NOT_FOUND", "Unknown in-flight stroke");
          return;
        }
        if (stroke.sessionId !== sessionId) {
          emitError(socket, "FORBIDDEN", "You do not own this stroke");
          return;
        }

        const doc = await createStroke({
          sessionId,
          points: stroke.points,
          color: stroke.color,
          brushSize: stroke.brushSize,
          isEraser: stroke.isEraser,
          clientStrokeId: stroke.clientStrokeId
        });
        const dto = toStrokeDto(doc);

        // Broadcast to every tile room the finalized stroke actually covers,
        // including rooms not previously announced (e.g. other tabs of the
        // same session already subscribed to a tile this stroke extends into).
        const finalRooms = new Set([...stroke.rooms, ...dto.tileIds.map(tileRoomName)]);
        for (const room of finalRooms) {
          io.to(room).emit(SOCKET_EVENTS.STROKE_COMPLETED, dto);
        }

        inFlight.end(input.clientStrokeId);
      } catch (err) {
        if (err instanceof ZodError) {
          emitError(socket, "VALIDATION_ERROR", err.message);
          return;
        }
        logger.error({ err }, "stroke:end failed");
        emitError(socket, "INTERNAL_ERROR", "Failed to finalize stroke");
      }
    })();
  });

  socket.on(SOCKET_EVENTS.STROKE_DELETE, (payload: unknown) => {
    void (async () => {
      try {
        const input = strokeDeleteSchema.parse(payload);
        const existing = await getStrokeById(input.strokeId);
        if (!existing || existing.deletedAt) {
          emitError(socket, "NOT_FOUND", "Stroke not found");
          return;
        }
        // CRITICAL: ownership must be derived server-side, never trusted from the client.
        if (existing.sessionId.toString() !== sessionId) {
          emitError(socket, "FORBIDDEN", "You do not own this stroke");
          return;
        }
        const doc = await softDeleteStroke(input.strokeId, sessionId);
        const rooms = doc.tileIds.map(tileRoomName);
        for (const room of rooms) {
          io.to(room).emit(SOCKET_EVENTS.STROKE_DELETED, { strokeId: input.strokeId });
        }
      } catch (err) {
        if (err instanceof ZodError) {
          emitError(socket, "VALIDATION_ERROR", err.message);
          return;
        }
        if (err instanceof HttpError) {
          emitError(socket, err.code, err.message);
          return;
        }
        logger.error({ err }, "stroke:delete failed");
        emitError(socket, "INTERNAL_ERROR", "Failed to delete stroke");
      }
    })();
  });
}

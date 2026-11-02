import type { Server } from "socket.io";
import { canvasSubscribeSchema, SOCKET_EVENTS } from "@everypaper/shared";
import { ZodError } from "zod";
import type { AppSocket } from "../types.js";
import { tileRoomName } from "../rooms/tile-rooms.js";
import { getTileSnapshot } from "../../modules/canvas/canvas.service.js";
import { logger } from "../../infrastructure/logger.js";

export function registerCanvasHandlers(_io: Server, socket: AppSocket): void {
  socket.on(SOCKET_EVENTS.CANVAS_SUBSCRIBE, (payload: unknown) => {
    void (async () => {
      try {
        const { tileIds } = canvasSubscribeSchema.parse(payload);
        for (const tileId of tileIds) {
          await socket.join(tileRoomName(tileId));
        }
        const snapshots = await Promise.all(tileIds.map((id) => getTileSnapshot(id)));
        socket.emit(SOCKET_EVENTS.CANVAS_SYNC, { tiles: snapshots });
      } catch (err) {
        if (err instanceof ZodError) {
          socket.emit(SOCKET_EVENTS.ERROR, { code: "VALIDATION_ERROR", message: err.message });
          return;
        }
        logger.error({ err }, "canvas:subscribe failed");
        socket.emit(SOCKET_EVENTS.ERROR, { code: "INTERNAL_ERROR", message: "Failed to subscribe" });
      }
    })();
  });

  socket.on(SOCKET_EVENTS.CANVAS_UNSUBSCRIBE, (payload: unknown) => {
    try {
      const { tileIds } = canvasSubscribeSchema.parse(payload);
      for (const tileId of tileIds) {
        void socket.leave(tileRoomName(tileId));
      }
    } catch (err) {
      if (err instanceof ZodError) {
        socket.emit(SOCKET_EVENTS.ERROR, { code: "VALIDATION_ERROR", message: err.message });
        return;
      }
      logger.error({ err }, "canvas:unsubscribe failed");
    }
  });
}

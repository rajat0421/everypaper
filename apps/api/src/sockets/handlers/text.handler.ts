import type { Server } from "socket.io";
import { ZodError } from "zod";
import { textCreateSchema, textDeleteSchema, worldToTile, tileIdOf, SOCKET_EVENTS } from "@everypaper/shared";
import type { AppSocket } from "../types.js";
import type { SlidingWindowRateLimiter } from "../services/rate-limiter.js";
import { tileRoomName } from "../rooms/tile-rooms.js";
import { createText, getTextById, softDeleteText, toTextDto } from "../../modules/texts/text.service.js";
import { HttpError } from "../../utils/http-error.js";
import { logger } from "../../infrastructure/logger.js";

function emitError(socket: AppSocket, code: string, message: string): void {
  socket.emit(SOCKET_EVENTS.ERROR, { code, message });
}

export function registerTextHandlers(
  io: Server,
  socket: AppSocket,
  textCreateLimiter: SlidingWindowRateLimiter
): void {
  const sessionId = socket.data.session.id;

  socket.on(SOCKET_EVENTS.TEXT_CREATE, (payload: unknown) => {
    void (async () => {
      try {
        const input = textCreateSchema.parse(payload);

        if (!textCreateLimiter.tryConsume(sessionId)) {
          emitError(socket, "RATE_LIMITED", "Too many texts created, slow down");
          return;
        }

        const doc = await createText({ ...input, sessionId });
        const dto = toTextDto(doc);
        const tileId = tileIdOf(worldToTile(dto.x, dto.y));
        io.to(tileRoomName(tileId)).emit(SOCKET_EVENTS.TEXT_CREATED, dto);
      } catch (err) {
        if (err instanceof ZodError) {
          emitError(socket, "VALIDATION_ERROR", err.message);
          return;
        }
        if (err instanceof HttpError) {
          emitError(socket, err.code, err.message);
          return;
        }
        logger.error({ err }, "text:create failed");
        emitError(socket, "INTERNAL_ERROR", "Failed to create text");
      }
    })();
  });

  socket.on(SOCKET_EVENTS.TEXT_DELETE, (payload: unknown) => {
    void (async () => {
      try {
        const input = textDeleteSchema.parse(payload);
        const existing = await getTextById(input.textId);
        if (!existing || existing.deletedAt) {
          emitError(socket, "NOT_FOUND", "Text not found");
          return;
        }
        // CRITICAL: ownership must be derived server-side, never trusted from the client.
        if (existing.sessionId.toString() !== sessionId) {
          emitError(socket, "FORBIDDEN", "You do not own this text");
          return;
        }
        const doc = await softDeleteText(input.textId, sessionId);
        const tileId = tileIdOf(worldToTile(doc.x, doc.y));
        io.to(tileRoomName(tileId)).emit(SOCKET_EVENTS.TEXT_DELETED, { textId: input.textId });
      } catch (err) {
        if (err instanceof ZodError) {
          emitError(socket, "VALIDATION_ERROR", err.message);
          return;
        }
        if (err instanceof HttpError) {
          emitError(socket, err.code, err.message);
          return;
        }
        logger.error({ err }, "text:delete failed");
        emitError(socket, "INTERNAL_ERROR", "Failed to delete text");
      }
    })();
  });
}

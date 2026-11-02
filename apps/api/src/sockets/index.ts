import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { LIMITS } from "@everypaper/shared";
import { corsOrigins } from "../config/env.js";
import { logger } from "../infrastructure/logger.js";
import { socketAuthMiddleware } from "./middleware/auth.js";
import { registerCanvasHandlers } from "./handlers/canvas.handler.js";
import { registerStrokeHandlers } from "./handlers/stroke.handler.js";
import { registerTextHandlers } from "./handlers/text.handler.js";
import { InFlightStrokeTracker } from "./services/in-flight-strokes.js";
import { SlidingWindowRateLimiter } from "./services/rate-limiter.js";
import type { AppSocket } from "./types.js";

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true
    }
  });

  const inFlight = new InFlightStrokeTracker();
  const strokeStartLimiter = new SlidingWindowRateLimiter(LIMITS.STROKE_RATE_PER_MINUTE, 60_000);
  const textCreateLimiter = new SlidingWindowRateLimiter(LIMITS.TEXT_RATE_PER_MINUTE, 60_000);

  io.use(socketAuthMiddleware);

  io.on("connection", (rawSocket) => {
    const socket = rawSocket as AppSocket;
    logger.info({ socketId: socket.id, sessionId: socket.data.session.id }, "socket connected");

    registerCanvasHandlers(io, socket);
    registerStrokeHandlers(io, socket, inFlight, strokeStartLimiter);
    registerTextHandlers(io, socket, textCreateLimiter);

    socket.on("disconnect", () => {
      inFlight.clearForSocket(socket.id);
      logger.info({ socketId: socket.id }, "socket disconnected");
    });
  });

  return io;
}

import express, { type Express, type Router } from "express";
import helmet from "helmet";
import cors from "cors";
import { corsOrigins } from "./config/env.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { requestLoggerMiddleware } from "./middleware/request-logger.js";
import { sessionResolverMiddleware } from "./middleware/session-resolver.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { sessionRouter } from "./modules/sessions/session.router.js";
import { canvasRouter } from "./modules/canvas/canvas.router.js";
import { strokeRouter } from "./modules/strokes/stroke.router.js";
import { textRouter } from "./modules/texts/text.router.js";
import { moderationRouter } from "./modules/moderation/moderation.router.js";
import { healthRouter } from "./modules/health/health.router.js";
import { API_VERSION } from "@everypaper/shared";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Allow non-browser requests (no Origin header, e.g. curl/health checks).
        if (!origin || corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true
    })
  );

  app.use(express.json({ limit: "256kb" }));
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);

  app.use(sessionResolverMiddleware);

  // Health endpoints are unversioned for simple liveness/readiness probes.
  app.use(healthRouter);

  const v1: Router = express.Router();
  v1.use(sessionRouter);
  v1.use(canvasRouter);
  v1.use(strokeRouter);
  v1.use(textRouter);
  v1.use(moderationRouter);
  app.use(`/api/${API_VERSION}`, v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

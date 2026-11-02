import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/http-error.js";
import { isProduction } from "../config/env.js";
import { logger } from "../infrastructure/logger.js";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `No route for ${req.method} ${req.path}`,
      requestId: req.requestId
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId;

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        requestId
      }
    });
    return;
  }

  if (err instanceof HttpError) {
    if (err.status >= 500) {
      logger.error({ err, requestId }, "request failed");
    }
    res.status(err.status).json({
      error: { code: err.code, message: err.message, requestId }
    });
    return;
  }

  logger.error({ err, requestId }, "unhandled error");
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: isProduction ? "Internal server error" : String((err as Error)?.message ?? err),
      requestId
    }
  });
}

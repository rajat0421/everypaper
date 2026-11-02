import type { NextFunction, Request, Response } from "express";
import { logger } from "../infrastructure/logger.js";

/**
 * Minimal structured request logger. Never logs cookies or auth headers
 * (only method/path/status/duration/requestId).
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger[level]({
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100
    });
  });

  next();
}

import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

export function requireModeratorKey(req: Request, _res: Response, next: NextFunction): void {
  const key = req.header("x-moderator-key");
  if (!key || key !== env.MODERATOR_API_KEY) {
    next(HttpError.unauthorized("Invalid or missing moderator key"));
    return;
  }
  next();
}

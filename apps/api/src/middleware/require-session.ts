import type { NextFunction, Request, Response } from "express";
import { createSession } from "../modules/sessions/session.service.js";
import { setSessionCookie } from "../modules/sessions/session-cookie.js";

/**
 * Ensures req.session is populated, creating a new anonymous session
 * (and setting the cookie) if the request had none. Use on REST routes
 * that need ownership (strokes, texts, reports).
 */
export async function requireSessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (req.session) {
      next();
      return;
    }
    const { doc, token } = await createSession();
    setSessionCookie(res, token);
    req.session = { id: doc.id as string, createdAt: doc.createdAt as Date };
    next();
  } catch (err) {
    next(err);
  }
}

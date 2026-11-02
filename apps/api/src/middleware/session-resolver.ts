import type { NextFunction, Request, Response } from "express";
import { parse as parseCookies } from "cookie";
import { SESSION_COOKIE_NAME } from "../config/env.js";
import { findSessionByToken } from "../modules/sessions/session.service.js";

/**
 * Resolves req.session from the session cookie, if present and valid.
 * Never logs the raw cookie/token. Does not create a session — routes
 * that require one are responsible for creating it.
 */
export async function sessionResolverMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      next();
      return;
    }
    const cookies = parseCookies(cookieHeader);
    const token = cookies[SESSION_COOKIE_NAME];
    if (!token) {
      next();
      return;
    }
    const doc = await findSessionByToken(token);
    if (doc) {
      req.session = { id: doc.id as string, createdAt: doc.createdAt as Date };
    }
    next();
  } catch (err) {
    next(err);
  }
}

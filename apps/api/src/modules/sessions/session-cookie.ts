import type { Response } from "express";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE_MS, isProduction, env } from "../../config/env.js";

export function setSessionCookie(res: Response, token: string): void {
  // The __Host- prefix (used in production) requires: Secure, Path=/, and NO Domain attribute.
  const domain = !isProduction && env.COOKIE_DOMAIN ? env.COOKIE_DOMAIN : undefined;
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
    domain
  });
}

export { SESSION_COOKIE_NAME };

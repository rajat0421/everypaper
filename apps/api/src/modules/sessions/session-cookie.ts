import type { Response } from "express";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE_MS, isProduction, env } from "../../config/env.js";

export function setSessionCookie(res: Response, token: string): void {
  // The __Host- prefix (used in production) requires: Secure, Path=/, and NO Domain attribute.
  const domain = !isProduction && env.COOKIE_DOMAIN ? env.COOKIE_DOMAIN : undefined;
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    // The frontend (Vercel) and backend (Render) are deployed on different
    // domains, so this cookie is always cross-site in production. SameSite=Lax
    // is never sent on cross-origin fetch/XHR/WebSocket requests, only on
    // top-level navigations — it must be "none" (which requires Secure) for
    // the browser to attach it to API/socket calls made from the Vercel origin.
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
    domain
  });
}

export { SESSION_COOKIE_NAME };

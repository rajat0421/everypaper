import type { Socket } from "socket.io";
import { parse as parseCookies } from "cookie";
import { SESSION_COOKIE_NAME } from "../../config/env.js";
import { findSessionByToken } from "../../modules/sessions/session.service.js";
import type { AppSocket } from "../types.js";

/**
 * Socket.IO handshake auth: reads the session cookie from the HTTP upgrade
 * request, validates it against the sessions collection, and rejects the
 * connection if there is no valid session. Clients must call POST /sessions
 * (REST) before connecting, so the cookie is always present on a legitimate
 * client.
 */
export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): void {
  void (async () => {
    try {
      const cookieHeader = socket.request.headers.cookie;
      if (!cookieHeader) {
        next(new Error("UNAUTHORIZED: no session cookie"));
        return;
      }
      const cookies = parseCookies(cookieHeader);
      const token = cookies[SESSION_COOKIE_NAME];
      if (!token) {
        next(new Error("UNAUTHORIZED: no session cookie"));
        return;
      }
      const doc = await findSessionByToken(token);
      if (!doc) {
        next(new Error("UNAUTHORIZED: invalid session"));
        return;
      }
      (socket as AppSocket).data.session = { id: doc.id as string, createdAt: doc.createdAt as Date };
      next();
    } catch (err) {
      next(new Error("UNAUTHORIZED: " + (err instanceof Error ? err.message : "unknown error")));
    }
  })();
}

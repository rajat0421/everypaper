# @everypaper/api

Backend for Everypaper: one world, one infinite shared drawing canvas, anonymous
browser-session ownership, real-time collaboration via Socket.IO, MongoDB persistence.

## Requirements

- Node >= 20
- MongoDB (local `mongod`, Docker, or an Atlas connection string — no code changes
  needed either way; the driver just needs a `mongodb://` or `mongodb+srv://` URI)

## Environment variables

See `/.env.example` at the repo root. Relevant to this app:

| Var | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `PORT` | `4000` | HTTP port, bound to `0.0.0.0` |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/everypaper` | Works unchanged with Atlas |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowlist |
| `MODERATOR_API_KEY` | `change-me-in-development` | Header `x-moderator-key` for internal moderation routes |
| `COOKIE_DOMAIN` | *(empty)* | Only used in non-production (the production cookie uses the `__Host-` prefix, which forbids a `Domain` attribute) |

## Local development

```bash
pnpm install
pnpm --filter @everypaper/shared build
pnpm --filter @everypaper/canvas-core build
pnpm --filter @everypaper/api dev
```

`dev` uses `tsx watch`. For production: `pnpm --filter @everypaper/api build && pnpm --filter @everypaper/api start`.

## Client connection flow (important)

1. The client calls `POST /api/v1/sessions` (or `GET /api/v1/sessions/me`) exactly
   once per browser profile. The server creates an anonymous session if none
   exists and responds with `Set-Cookie: ep_session=...` (or `__Host-ep_session`
   in production) — `HttpOnly`, `SameSite=Lax`, 10-year `Max-Age`. The response
   body is `{ sessionId, createdAt }` for display purposes only; it is **not**
   a credential — ownership is always derived server-side from the cookie.
2. Only after that REST round trip does the client open the Socket.IO
   connection. The browser will automatically attach the session cookie to the
   Socket.IO handshake (same-origin or CORS with `credentials: true`). The
   server reads `socket.request.headers.cookie` during the handshake, hashes
   it, and validates it against the `sessions` collection. A connection
   without a valid session cookie is rejected at `io.use(...)` — no socket
   events are available until step 1 has happened.
3. There is no login, no password, no client-supplied identity of any kind.
   Losing the cookie (clearing site data, a new browser/profile) means a new,
   unrelated anonymous identity.

## REST API (base path `/api/v1`)

- `POST /sessions` — create (or return the existing) session, sets the cookie.
- `GET /sessions/me` — same as above; convenient for "ensure I have an identity" on load.
- `GET /canvas/tiles?ids=tx:ty,tx:ty,...` — batch tile fetch (capped at `LIMITS.MAX_TILES_PER_SUBSCRIBE`).
- `GET /canvas/tiles/:x/:y` — single tile fetch.
- `POST /strokes` — REST fallback for submitting a complete stroke (sockets are the primary path). Idempotent on `clientStrokeId`.
- `DELETE /strokes/:id` — soft-delete, ownership-checked (403 if you don't own it).
- `POST /texts` — create a text annotation. Idempotent on `clientTextId`. Control characters are stripped server-side.
- `DELETE /texts/:id` — soft-delete, ownership-checked.
- `POST /reports` — flag a stroke/text for moderation (requires a session, rate-limited).
- `POST /moderation/strokes/:id/remove`, `POST /moderation/texts/:id/remove` — internal-only, gated by the `x-moderator-key` header matching `MODERATOR_API_KEY`. Soft-deletes regardless of ownership and records a `moderationactions` document.
- `GET /health` — liveness (always 200 once the process is up).
- `GET /health/ready` — readiness (200 only if MongoDB is connected).

All errors share the shape `{ error: { code, message, requestId } }`.

## Socket.IO events

See `packages/shared/src/constants.ts` (`SOCKET_EVENTS`) for the exact event name
constants and `packages/shared/src/schemas.ts` for payload shapes. Summary:

- `canvas:subscribe { tileIds }` → joins those tile rooms and replies with
  `canvas:sync { tiles: [{ tileId, strokes, texts }] }` for the newly joined tiles.
- `canvas:unsubscribe { tileIds }` → leaves those rooms.
- `stroke:start / stroke:points / stroke:end` → live stroke broadcast
  (`stroke:started` / `stroke:points` / `stroke:completed`) to the tile rooms the
  stroke covers; the server persists only on `stroke:end`, idempotently by
  `clientStrokeId`.
- `stroke:delete { strokeId }` → soft-deletes and broadcasts `stroke:deleted`,
  **only if the requesting session owns the stroke** (ownership is always
  re-derived server-side from the socket's authenticated session — the client's
  claim is never trusted).
- `text:create / text:delete` → same idempotency/ownership rules as strokes.
- Every inbound payload is validated with the shared zod schemas; invalid
  payloads get an `error { code: "VALIDATION_ERROR", message }` event and are
  dropped — the connection is never torn down for a bad payload.
- Per-session rate limiting applies to `stroke:start` and `text:create`
  (`LIMITS.STROKE_RATE_PER_MINUTE` / `LIMITS.TEXT_RATE_PER_MINUTE`), via an
  in-memory sliding window (`src/sockets/services/rate-limiter.ts`) — swappable
  for a distributed limiter later without touching call sites.

## Moderation & redo

- Strokes/texts are always **soft-deleted** (`deletedAt`), never hard-deleted,
  so moderation history is preserved.
- `src/modules/strokes/stroke.service.ts` exposes `restoreOwnStroke(id, sessionId)`
  for a client-side "redo" of its own delete, ownership-checked; it is not wired
  to a REST/socket route since the frontend's undo/redo stack decides when to
  call it — intentionally minimal per spec.

## Testing

```bash
pnpm --filter @everypaper/api test
```

Uses `vitest` + `supertest` for REST and `socket.io-client` against a real
in-process HTTP+Socket.IO server for the realtime flows. MongoDB is provided by
`mongodb-memory-server` (see `src/test/setup.ts`) — no external database needed
to run the suite.

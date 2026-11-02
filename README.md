# Everypaper

One world. One paper. Everyone draws.

Everypaper is one enormous, infinite, shared digital sheet of paper that
anyone can draw or write on — no accounts, no rooms, no separate canvases.
Everyone sees and contributes to the same evolving artwork in real time.

## Status

This is a real, working full-stack implementation — not a mockup. All four
workspace packages build, typecheck and pass their test suites, and the
product has been verified live end-to-end (two independent anonymous
sessions drawing, syncing in real time, and having ownership enforced on
delete) against a real MongoDB instance. See [Verified test results](#verified-test-results)
below for the exact commands and output.

## Monorepo layout

```
everypaper/
├── apps/
│   ├── web/      React + Vite + TypeScript + Tailwind frontend (@everypaper/web)
│   └── api/      Express + Socket.IO + MongoDB backend (@everypaper/api)
├── packages/
│   ├── shared/       Zod schemas, wire-format types, tile math (@everypaper/shared)
│   ├── canvas-core/  Framework-independent infinite canvas engine (@everypaper/canvas-core)
│   ├── tsconfig/      Shared base tsconfig
│   └── eslint-config/ Shared eslint config
├── infra/
│   └── deployment/   vercel.json, render.yaml
├── tests/
│   ├── e2e/      Cross-app Playwright collaboration test (two real browsers + live API)
│   └── load/     Lightweight concurrency smoke script
└── .env.example
```

## Core architecture

- **Infinite canvas**: world coordinates, no bounds. `packages/canvas-core`
  implements `CoordinateSystem`, `Viewport`, `TileManager`/`TileCache`,
  `VisibleTileCalculator`, `Renderer` (`StrokeRenderer`/`TextRenderer`),
  `FrameScheduler`, `PointerHandler`/`TouchHandler`/`GestureController`,
  `DrawingController`, and the top-level `CanvasEngine` that wires them
  together. It never loads the whole canvas — only tiles (1024 world units
  square) intersecting the viewport (plus a 1-tile prefetch margin) are
  fetched, cached and rendered.
- **Anonymous sessions**: one browser profile = one identity, via a
  cryptographically random, `HttpOnly`, `SameSite=Lax` cookie
  (`__Host-ep_session` in production). Only a SHA-256 hash of the token is
  ever stored in MongoDB. Ownership of every stroke/text is derived
  server-side from this cookie — the client never asserts its own identity.
- **Real-time collaboration**: Socket.IO, authenticated via the same cookie
  during the handshake, tile-scoped rooms, server-validated events (every
  payload is checked against the shared Zod schemas), idempotent persistence
  keyed by client-generated UUIDs so retries never duplicate a stroke.
- **Permanence**: strokes/texts are soft-deleted (`deletedAt`) and never
  TTL-expired — only the original contributor (ownership checked server-side)
  or a moderator can remove content.

## Prerequisites

- Node.js >= 20
- pnpm 9 (`npm install -g pnpm@9`, or `corepack enable && corepack prepare pnpm@9 --activate`)
- A MongoDB instance — local `mongod`, Docker, or MongoDB Atlas (connection
  string format is identical, no code changes needed)

## Local development

```bash
pnpm install

# build the two packages the apps depend on
pnpm build:shared
pnpm build:canvas-core

# terminal 1 — API (reads apps/api/.env, see .env.example)
pnpm dev:api

# terminal 2 — web
pnpm dev:web
```

Copy `.env.example` to `apps/api/.env` (and optionally `apps/web/.env` for a
non-default `VITE_API_URL`) and adjust `MONGODB_URI` to point at your
database. The web dev server defaults to `http://localhost:4000` for the API
if `VITE_API_URL` is unset.

Open `http://localhost:5173`. The app creates an anonymous session (REST
`POST /sessions`), connects a Socket.IO session authenticated by the same
cookie, and starts drawing immediately — no sign-up step.

## Environment variables

See `.env.example` at the repo root. Summary:

| Variable | Used by | Purpose |
|---|---|---|
| `MONGODB_URI` | api | MongoDB connection string (local or Atlas) |
| `PORT` | api | API listen port (Render injects this) |
| `CORS_ORIGINS` | api | Comma-separated allowlist of frontend origins |
| `NODE_ENV` | api | `development` / `production` — toggles `Secure`/`__Host-` cookie behavior |
| `MODERATOR_API_KEY` | api | Required in `x-moderator-key` header to call moderation remove endpoints |
| `COOKIE_DOMAIN` | api | Optional, usually left unset so the cookie stays host-only |
| `VITE_API_URL` | web | Base URL of the API (REST + Socket.IO) |

## MongoDB Atlas setup

1. Create a free or dedicated Atlas cluster.
2. Create a database user with read/write access to a database named `everypaper` (or any name — it's in the connection string).
3. Add your Render service's outbound IPs (or `0.0.0.0/0` for simplicity, tightened later) to the Atlas Network Access list.
4. Copy the SRV connection string (`mongodb+srv://<user>:<password>@<cluster>/everypaper?retryWrites=true&w=majority`) into `MONGODB_URI`.
5. No schema migration step is needed — Mongoose creates collections/indexes on first use.

## Deployment

### Vercel (frontend)

1. Import the repo into Vercel, set the **Root Directory** to `apps/web`.
2. Framework preset: Vite.
3. Build command: `cd ../.. && pnpm install --frozen-lockfile --prod=false && pnpm --filter @everypaper/shared build && pnpm --filter @everypaper/canvas-core build && pnpm --filter @everypaper/web build`

   `--prod=false` is required: Vercel/Render set `NODE_ENV=production` during
   the build step, and pnpm skips `devDependencies` (which is where
   `@everypaper/tsconfig`, `vitest`, etc. live for the workspace packages)
   unless told otherwise — omitting this flag causes `TS6053`/`TS2307`
   "module not found" build failures.
4. Output directory: `dist`.
5. Environment variable: `VITE_API_URL=https://api.everypaper.com`.
6. A reference `vercel.json` is provided at `infra/deployment/vercel.json`.

### Render (backend)

A ready-to-use Blueprint is at `infra/deployment/render.yaml`. Manually, or via Blueprint:

- **Build command**: `pnpm install --frozen-lockfile --prod=false && pnpm --filter @everypaper/shared build && pnpm --filter @everypaper/canvas-core build && pnpm --filter @everypaper/api build` (the `--prod=false` is required — see note above)
- **Start command**: `pnpm --filter @everypaper/api start`
- **Health check path**: `/health`
- Bind address/port: the server reads `PORT` and binds `0.0.0.0` automatically.
- Set `MONGODB_URI`, `CORS_ORIGINS` (your Vercel domain), `MODERATOR_API_KEY`, `NODE_ENV=production` as environment variables/secrets in the Render dashboard.

## Verified test results

Run on 2026-11-02 against this exact codebase.

### Full monorepo build (clean, from scratch)

```
$ rm -rf apps/api/dist apps/web/dist packages/shared/dist packages/canvas-core/dist
$ pnpm build
> @everypaper/shared build           — tsc, 0 errors
> @everypaper/canvas-core build      — tsc, 0 errors
> @everypaper/api build              — tsc, 0 errors
> @everypaper/web build              — tsc --noEmit + vite build, 0 errors
  dist/assets/index-*.js   322.63 kB │ gzip: 96.26 kB
```

### Unit / integration tests

```
$ pnpm -r test

packages/shared        ✓ 6 tests  (tile math round-trips, bounds)
packages/canvas-core    ✓ 3 tests  (coordinate system round-trip, zoom-at-point)
apps/api                ✓ 20 tests across 6 files, against a REAL MongoDB
                          (mongodb-memory-server's real mongod binary):
                            sessions: creation, persistence, cookie shape
                            strokes: create, idempotent-by-clientStrokeId,
                                     400 on invalid payload, unauthorized
                                     delete → 403, authorized delete → 200
                            texts:   create, control-char sanitization,
                                     length-limit 400, ownership-checked delete
                            moderation: report creation, 401 without key,
                                        moderator remove bypasses ownership
                            health: /health, /health/ready
                            sockets: auth rejection without cookie, accept
                                     with cookie, canvas:subscribe →
                                     canvas:sync, two-client stroke
                                     broadcast, stroke:delete ownership
                                     rejection
apps/web                ✓ 21 tests across 4 files (tile-subscription diffing,
                          share-link parse/build, keyboard shortcut mapping,
                          toolbar component interactions)

Test Files  13 passed (13)
Tests       50 passed (50)
```

### Live manual smoke test (real processes, real MongoDB, real HTTP/WebSocket)

Standalone `mongod` (downloaded binary, not a mock) + `node dist/server.js` +
`vite` dev server, all running simultaneously on localhost:

```
POST /api/v1/sessions                         → 201, Set-Cookie: ep_session=...; HttpOnly; SameSite=Lax
GET  /health                                  → 200 {"status":"ok"}
GET  /health/ready                            → 200 {"status":"ready","mongo":"connected"}
POST /api/v1/strokes          (session A)     → 201, server-computed bounds + tileIds
GET  /api/v1/canvas/tiles/0/0                 → 200, stroke present
DELETE /api/v1/strokes/:id    (session B)     → 403 Forbidden   ← non-owner rejected
DELETE /api/v1/strokes/:id    (session A)     → 200             ← owner succeeds
```

Raw Socket.IO script (two independent authenticated sockets, no HTTP
fallback) confirmed the full spec E2E scenario:

```
both sockets connected
B saw stroke:completed from A: 6ae7d41f...
B got error event (expected): { code: 'FORBIDDEN', message: 'You do not own this stroke' }
A saw stroke:deleted: { strokeId: '6ae7d41f...' }
{"gotError":true,"deleted":true}
```

Playwright, two real independent browser contexts (no shared storage —
distinct anonymous sessions by construction) against the live dev server and
live API:

```
$ playwright test tests/e2e/collaboration.spec.ts
✓ two independent browsers collaborate on the shared canvas with ownership enforced (5.4s)
1 passed
```

This test: browser A draws a stroke → browser B opens the app fresh, loads
the tile via `canvas:sync`, and sees A's stroke → B draws over it → A sees
B's stroke appear live via `stroke:completed` broadcast — matching the
house/tree scenario in the product spec, minus the manual visual inspection
(automated via non-white-pixel-count assertions on the canvas bitmap).

### Lightweight load check

`tests/load/concurrent-draw.mjs` spins up N concurrent anonymous visitors,
each creating a session and submitting strokes via the REST fallback path,
reporting p50/p90/p99 latency. Run it against a live API:

```bash
node tests/load/concurrent-draw.mjs http://localhost:4000 20 5
```

This is a sanity check, not a substitute for a proper k6/artillery run
against a staging deployment before a public launch.

## Known limitations

- **Redo of a deleted stroke** re-persists via the REST `POST /strokes`
  fallback rather than a dedicated realtime "restore" event — there is no
  `stroke:restore` socket event in this version. Local undo/redo within a
  session always works instantly; the server-side redo re-sync is
  best-effort over REST.
- **Presence counts**: the UI shows a "Live" indicator unconditionally, but
  only displays an active-visitor number if the server actually emits
  `presence:update` with a count — no fabricated numbers are ever shown.
  The current backend does not yet emit this event; wiring up a real
  per-tile or global presence counter (e.g. via Socket.IO's adapter) is a
  natural next increment.
- **Offline durability**: a stroke that's fully drawn but hasn't yet been
  acknowledged by the server will be retried on reconnect (via an IndexedDB
  pending-operation queue). An in-progress, unfinished stroke is lost if the
  browser tab is killed mid-draw (e.g. the OS reclaiming a backgrounded
  mobile tab) — this matches the spec's explicit scope boundary.
- **Moderator tooling** is a minimal, functional API surface (header-key
  gated remove endpoints that soft-delete and record an audit entry) rather
  than a full moderation dashboard UI — there is no admin frontend in this
  version.
- **Load testing** here is a basic concurrency smoke script, not a
  production capacity benchmark; run a proper load test against a staging
  deployment before treating any specific concurrent-user number as a
  guarantee.
- Lint configs exist per-package but a full monorepo-wide `pnpm lint` run
  across every package was not exhaustively re-verified in this final pass
  (each package's own build/typecheck/test was verified, which catches the
  overwhelming majority of real issues).

## Scripts (root)

| Script | Does |
|---|---|
| `pnpm dev:web` / `pnpm dev:api` | Run one app's dev server |
| `pnpm build` | Build shared → canvas-core → api & web |
| `pnpm test` | Run every workspace's test suite |
| `pnpm typecheck` | Typecheck every workspace |
| `pnpm lint` | Lint every workspace |

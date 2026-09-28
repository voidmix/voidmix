# Runtime and Deployment

## Deployment units

```text
web       Node container
api       Standalone API container
postgres  independent service
desktop   macOS and Windows installers
```

API is the primary HTTP deployment and includes Auth, Admin, Hono, and oRPC.
Web serves pages and SSR and calls the independent API origin.
Desktop consumes the API origin and is distributed through Tauri installers.

## Local PostgreSQL

```bash
docker compose up -d postgres
bun run db:migrate
bun run db:seed
bun run db:studio
```

The API and Worker require `DATABASE_URL`; Web does not initialize a database.
`REDIS_URL` is optional; when present, both hosts share the configured Redis
namespace for Better Auth secondary storage and the short-lived Auth policy cache.

## Containers and Railway

Each deployable Node service owns its container and Railway configuration:

```text
apps/web/Dockerfile       apps/web/railway.toml
apps/api/Dockerfile       apps/api/railway.toml
```

The Railway service root remains the monorepo root so the Docker build can read
workspace packages and `bun.lock`. Select the matching nested `railway.toml` as
the service config path.

- Web serves Nitro's `.output/server/index.mjs` on Railway's `PORT` and exposes
  page routes plus `/health`.
- API starts through `apps/api/scripts/start.mjs` and exposes `/api/auth/*`,
  `/rpc/*`, and `/health` on its own origin.
- API requires production values for database, Auth, and allowed external
  origins. Mail can come from database settings or environment fallbacks;
  missing mail does not prevent startup. Web does not require database or Auth
  secrets; its builds require `VITE_API_URL` pointing at the public API origin.

Set `VITE_API_URL` on the Railway **Web** service before building (for the hosted
Voidmix deployment, `https://api.voidmix.com`). The Dockerfile declares this
public build argument so Railway makes it available to Vite. Missing or empty
values stop the image build instead of shipping a browser that requests
`/rpc/*` and `/api/auth/*` from the Web host and receives 404 responses. For a
manual Docker build, pass the same argument:

```bash
docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=https://api.example.com -t voidmix-web .
```

Changing a runtime variable on an existing Web image is insufficient: rebuild
and redeploy Web after changing its API origin. API's `ALLOWED_ORIGINS` must
include the exact Web origin (scheme and hostname, no trailing slash), and
`AUTH_URL` must point to the public API origin. Keep any other permitted origins
when updating the comma-separated allowlist. For sibling production domains,
set API's `AUTH_DOMAIN` to their common cookie domain (for example,
`voidmix.com`), so Web SSR receives the same session cookie as the API.

To diagnose a protected-page failure, inspect the failing request URL first.
`https://voidmix.com/rpc/account/get` returning plain 404 means the Web bundle
has no API origin. The same read on `https://api.voidmix.com` should return a
structured `UNAUTHORIZED` response without a session; it must also include
`Access-Control-Allow-Origin: https://voidmix.com` and
`Access-Control-Allow-Credentials: true` for requests from Web. A healthy
`/health` alone does not verify RPC routing or browser CORS.

Production startup does not use the private `vmx` CLI. Railway and other
platforms inject values through `process.env`; a `/app/.env` file is optional,
not required. The container entrypoints load that file only when it exists, so
missing optional files do not produce startup warnings. `.dockerignore`
excludes local `.env` and `.env.local` files from image build contexts.

Remaining `VITE_*` logging values are compiled into browser bundles. A runtime
`/app/.env` mount cannot change them. Auth and Admin transport use the configured
API origin with credentialed cookies.

The shared API environment schema requires `DATABASE_URL` during startup. The
in-memory repository remains available only to direct `createApiApp` tests that
inject it explicitly; it is not a runtime fallback.

Web and API hosts explicitly select Nitro's `node-server` preset
and emit self-contained Node server bundles. Explicitly selecting the preset
prevents a deployment-level `NITRO_PRESET` value from emitting a Bun server
that cannot run in the Node 24 runtime. Runtime stages copy generated artifacts
with `node:node` ownership before switching to the unprivileged `node` user.
The Web image contains only the application package manifest and `.output`; it
does not run a second filtered workspace install or copy repository
`node_modules`. Its container sets `NITRO_HOST=0.0.0.0`, reads Railway's
injected `PORT`, and declares the exact Node start command in `railway.toml`.

## Runtime policy

Node.js is the initial production runtime for Web and API. Bun remains
the package manager and script runtime. Move a production runtime to Bun only
after compatibility tests pass and a representative benchmark demonstrates a
meaningful improvement.

## Desktop lifecycle

Tauri's Rust process owns the tray, native notifications, and window lifecycle.
TanStack Start builds a static SPA shell at `dist/client/index.html`; the
build-time `dist/server` output only prerenders that shell and is not included
in the installer. The renderer is a cloud-backed client with no RSC, server
function, or server-route runtime. The first version has no separate background
daemon and no offline synchronization engine.

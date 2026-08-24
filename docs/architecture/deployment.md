# Runtime and Deployment

## Deployment units

```text
web       Node container
api       Temporary standalone compatibility container
postgres  independent service
desktop   macOS and Windows installers
```

Web is the primary deployment and includes public pages, Auth, Admin, Hono, and
oRPC. The standalone API remains independently deployable during migration.
Desktop consumes either origin and is distributed through Tauri installers.

## Local PostgreSQL

```bash
docker compose up -d postgres
bun run db:migrate
bun run db:seed
bun run db:studio
```

Every host of `@voidmix/api-runtime`, including Web, requires `DATABASE_URL`.

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
  `/health`, `/api/auth/*`, and `/rpc/*` on the same origin.
- API starts through `apps/api/scripts/start.mjs` and preserves the same API
  paths on its compatibility origin.
- Both hosts require production values for database, Auth, and allowed external
  origins. Mail can come from Admin-managed database settings or compatibility
  environment variables; missing mail does not prevent startup. Browser clients
  do not require an API build-time URL.

Production startup does not use the private `vmx` CLI. Railway and other
platforms inject values through `process.env`; a `/app/.env` file is optional,
not required. The container entrypoints load that file only when it exists, so
missing optional files do not produce startup warnings. `.dockerignore`
excludes local `.env` and `.env.local` files from image build contexts.

Remaining `VITE_*` logging values are compiled into browser bundles. A runtime
`/app/.env` mount cannot change them. Auth and Admin transport use relative
same-origin URLs and read no server origin from the browser bundle.

The shared API environment schema requires `DATABASE_URL` during startup. The
in-memory repository remains available only to direct `createApiApp` tests that
inject it explicitly; it is not a runtime fallback.

Web and API compatibility hosts explicitly select Nitro's `node-server` preset
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
The renderer is a cloud-backed client. The first version has no separate
background daemon and no offline synchronization engine.

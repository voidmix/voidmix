# Runtime and Deployment

## Deployment units

```text
web       Node container
api       Hono/Nitro Node container
postgres  independent service
desktop   macOS and Windows installers
```

Web and API are independently deployable. Web includes the public, auth, and
Admin browser routes. Desktop consumes the cloud API and is distributed through
Tauri installers rather than a server platform.

## Local PostgreSQL

```bash
docker compose up -d postgres
bun run db:migrate
bun run db:seed
bun run db:studio
```

The API requires `DATABASE_URL` in every runtime environment.

## Containers and Railway

Each deployable Node service owns its container and Railway configuration:

```text
apps/web/Dockerfile       apps/web/railway.toml
apps/api/Dockerfile       apps/api/railway.toml
```

The Railway service root remains the monorepo root so the Docker build can read
workspace packages and `bun.lock`. Select the matching nested `railway.toml` as
the service config path.

- Web serves Nitro's `.output/server/index.mjs` on Railway's `PORT`.
- API starts through `apps/api/scripts/start.mjs` and exposes `/health`.
- API requires production values for `DATABASE_URL` and `ALLOWED_ORIGINS`.
- Web receives `VITE_API_URL` at build time for auth and Admin requests.

Production startup does not use the private `vmx` CLI. Railway and other
platforms inject values through `process.env`; a `/app/.env` file is optional,
not required. The container entrypoints load that file only when it exists, so
missing optional files do not produce startup warnings. `.dockerignore`
excludes local `.env` and `.env.local` files from image build contexts.

`VITE_*` values are compiled into browser bundles. Docker or Railway must
provide them during the build stage; a runtime `/app/.env` mount cannot change
an already-built client bundle. Dotenvx is only a local development/build file
loader, while `@voidmix/env` performs application schema validation after
values enter the process.

The API environment schema requires `DATABASE_URL` during startup. The in-memory
repository remains available only to direct `createApiApp` tests that inject it
explicitly; it is not a runtime fallback.

Web and API explicitly select Nitro's `node-server` preset and emit
self-contained Node server bundles. Explicitly selecting the preset prevents a
deployment-level `NITRO_PRESET` value from emitting a Bun server that cannot
run in the Node 24 runtime. Runtime stages copy generated artifacts with
`node:node` ownership before switching to the unprivileged `node` user. The Web
image contains only the application package manifest and `.output`; it does not
run a second filtered workspace install or copy repository `node_modules`. Its
container sets `NITRO_HOST=0.0.0.0`, reads Railway's injected `PORT`, and
declares the exact Node start command in `railway.toml`.

## Runtime policy

Node.js is the initial production runtime for Web and API. Bun remains
the package manager and script runtime. Move a production runtime to Bun only
after compatibility tests pass and a representative benchmark demonstrates a
meaningful improvement.

## Desktop lifecycle

Tauri's Rust process owns the tray, native notifications, and window lifecycle.
The renderer is a cloud-backed client. The first version has no separate
background daemon and no offline synchronization engine.

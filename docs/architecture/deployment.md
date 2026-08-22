# Runtime and Deployment

## Deployment units

```text
web       Node container
admin     Node container
api       Hono/Nitro Node container
postgres  independent service
desktop   macOS and Windows installers
```

Web, Admin, and API are independently deployable. Desktop consumes the cloud
API and is distributed through Tauri installers rather than a server platform.

## Local PostgreSQL

```bash
docker compose up -d postgres
bun run db:migrate
bun run db:seed
bun run db:studio
```

When `DATABASE_URL` is absent, the API uses an in-memory development repository.

## Containers and Railway

Each deployable Node service owns its container and Railway configuration:

```text
apps/web/Dockerfile       apps/web/railway.toml
apps/admin/Dockerfile     apps/admin/railway.toml
apps/api/Dockerfile       apps/api/railway.toml
```

The Railway service root remains the monorepo root so the Docker build can read
workspace packages and `bun.lock`. Select the matching nested `railway.toml` as
the service config path.

- Web and Admin serve Nitro's `.output/server/index.mjs` on Railway's `PORT`.
- API starts through `apps/api/scripts/start.mjs` and exposes `/health`.
- API requires production values for `DATABASE_URL` and `ALLOWED_ORIGINS`.
- A separately deployed Admin build receives `VITE_API_URL` at build time.

Production startup does not use the private `vmx` CLI. Railway and other
platforms inject values through `process.env`. The Node containers also accept
an optional shared mount at `/app/.env` through Node 24's
`--env-file-if-exists` flag; `.dockerignore` excludes local `.env` and
`.env.local` files from image build contexts.

`VITE_*` values are compiled into browser bundles. Docker or Railway must
provide them during the build stage; a runtime `/app/.env` mount cannot change
an already-built client bundle. Dotenvx is only a local development/build file
loader, while `@voidmix/env` performs application schema validation after
values enter the process.

Web, Admin, and API explicitly select Nitro's `node-server` preset and emit
self-contained Node server bundles. Explicitly selecting the preset prevents a
deployment-level `NITRO_PRESET` value from emitting a Bun server that cannot
run in the Node 24 runtime. Runtime stages copy generated artifacts with
`node:node` ownership before switching to the unprivileged `node` user. Web and
Admin images contain only the application package manifest and `.output`; they
do not run a second filtered workspace install or copy repository
`node_modules`. Their containers set `NITRO_HOST=0.0.0.0`, read Railway's
injected `PORT`, and declare the exact Node start command in `railway.toml`.

## Runtime policy

Node.js is the initial production runtime for Web, Admin, and API. Bun remains
the package manager and script runtime. Move a production runtime to Bun only
after compatibility tests pass and a representative benchmark demonstrates a
meaningful improvement.

## Desktop lifecycle

Tauri's Rust process owns the tray, native notifications, and window lifecycle.
The renderer is a cloud-backed client. The first version has no separate
background daemon and no offline synchronization engine.

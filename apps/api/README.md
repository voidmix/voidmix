# API application

`@voidmix/api-server` is the Bun backend. Vite's Nitro plugin builds the Hono entry point in `server.ts`; oRPC implements the public contract from `@voidmix/api`. This application owns authentication and backend resource lifetimes.

```sh
bun run dev:api
bun run build:api
bun run start:api
```

Run these commands from the repository root. Startup requires `DATABASE_URL`, `BETTER_AUTH_URL`, and `BETTER_AUTH_SECRET`; see [configuration](../../docs/configuration.md). `API_PORT` defaults to 3002. Building does not require live infrastructure.

## Layout

| Location                          | Responsibility                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `server.ts`                       | Connect the process runtime to the HTTP factory                                |
| `src/app.ts`                      | Compose Hono, middleware ordering, and routes from explicit dependencies       |
| `src/config.ts`                   | Pure environment snapshot, required values, and origin defaults                |
| `src/resources.ts`                | Own auth, the PostgreSQL pool, lazy optional clients, and shared shutdown      |
| `src/runtime.ts`                  | Process configuration, logger initialization, and one resource owner           |
| `vite.config.ts`                  | Nitro Bun preset, server entry, shutdown plugin                                |
| `src/routes`                      | Health, auth mounting, and RPC implementations                                 |
| `src/middleware`                  | Request events, errors, CORS, session resolution, RPC adaptation/authorization |
| `src/lib/cache.ts` / `storage.ts` | Optional lazy clients scoped to their resource owner                           |
| `src/lib/context.ts` / `orpc.ts`  | Transport context and logged contract implementer                              |
| `src/plugins/resources.ts`        | Close every owned resource when Nitro shuts down                               |

## Request flow

Logging wraps all responses, including preflights and errors. `GET /health` returns `{ "status": "ok" }` without querying infrastructure. `/api/auth/*` delegates to Better Auth. `/api/rpc/*` resolves the current session and passes headers, session, and the request logger to oRPC. Public `greet` accepts a trimmed 1–80 character name; `me` uses `requireSession`.

Add HTTP routes in `src/routes` and register them in `src/app.ts`. Add RPC input/output to `packages/api/src/contract.ts` first, then implement it in `src/routes/rpc.ts`. Keep business authorization in the procedure or its middleware; a resolved session alone does not grant permission.

`createApp({ auth, corsOrigins, logger })` assembles HTTP behavior without reading process configuration or constructing backend clients. Its auth interface contains only request handling and session resolution. Tests provide an in-memory auth adapter and call Hono's `app.request()` directly. CORS and session state are scoped to each application instance; evlog's standalone logger remains process-wide.

Only `server.ts` and the Nitro lifecycle plugin import `src/runtime.ts`. Other modules accept configuration or dependencies explicitly. `loadApiConfig(env)` captures configuration once; later process environment changes do not alter the running application's origins or backend settings. Enabled S3 requires all connection fields at startup, while connections remain lazy.

The resource owner exposes `getCache()` and `getStorage()`. They return `null` when disabled and surface backend failures to callers. Pass these capabilities to a route or procedure context when needed; do not import the process runtime there. `close()` runs every disposer, reports aggregated failures, returns the same shutdown promise on repeated calls, and prevents new handles from being created. Nitro delegates to it after request processing stops. Register new process-owned resources and cleanup together in `src/resources.ts`.

## Logs and verification

Use `c.get("log")` in Hono and `context.log` in RPC. Enrich the existing event; do not emit a second event per request or log credentials and full request bodies. See [logger](../../packages/logger/README.md).

```sh
bun run check
bun run test:api
bun run build:api
E2E_DATABASE_URL=postgresql://.../voidmix_e2e bun run test:e2e -- --project=api
```

API production output is `.output`, started with Bun. [Architecture](../../docs/architecture.md) explains proxying and device authentication; [deployment](../../deploy/README.md) explains migrations before startup.

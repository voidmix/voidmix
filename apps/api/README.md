# API application

`@voidmix/api-server` is the Bun backend. Vite's Nitro plugin builds the Hono entry point in `server.ts`; oRPC implements the public contract from `@voidmix/api`. This application owns authentication and backend resource lifetimes.

```sh
bun run dev:api
bun run build:api
bun run start:api
```

Run these commands from the repository root. Startup requires `DATABASE_URL`, `BETTER_AUTH_URL`, and `BETTER_AUTH_SECRET`; see [configuration](../../docs/configuration.md). `API_PORT` defaults to 3002. Building does not require live infrastructure.

## Layout

| Location                          | Responsibility                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| `server.ts`                       | Connect the process runtime to the HTTP factory                                           |
| `src/app.ts`                      | Compose Hono, middleware ordering, and routes from explicit dependencies                  |
| `src/config.ts`                   | Pure environment snapshot, required values, and origin defaults                           |
| `src/resources.ts`                | Own auth, expose the guarded Drizzle handle and lazy optional clients, and share shutdown |
| `src/runtime.ts`                  | Process configuration, logger with optional OTLP drain, one resource owner                |
| `vite.config.ts`                  | Nitro Bun preset, server entry, shutdown plugin                                           |
| `src/routes`                      | Health, auth mounting, and RPC implementations                                            |
| `src/middleware`                  | Request events, errors, CORS, session resolution, per-app RPC adaptation/authorization    |
| `src/lib/cache.ts` / `storage.ts` | Optional lazy clients scoped to their resource owner                                      |
| `src/lib/context.ts` / `orpc.ts`  | `ApiServices`, request context, and logged contract implementer                           |
| `src/plugins/resources.ts`        | Close every owned resource, then flush the log drain, at Nitro shutdown                   |

## Request flow

Logging wraps all responses, including preflights and errors. `GET /health` returns `{ "status": "ok" }` without querying infrastructure. `GET /ready` runs a two-second-bounded PostgreSQL query and returns 503 when it fails or shutdown has begun; the optional cache is reported as `ok`, `unavailable`, or `disabled` without affecting the status. Failure causes go to the request event, never the response. `/api/auth/*` delegates to Better Auth. `/api/rpc/*` resolves the current session and passes headers, session, the request logger, and `services` to oRPC. Public `greet` accepts a trimmed 1–80 character name; `me` uses `requireSession`.

Add HTTP routes in `src/routes` and register them in `src/app.ts`. Add RPC input/output to `packages/api/src/contract.ts` first, then implement it in `src/routes/rpc.ts`. Keep business authorization in the procedure or its middleware; a resolved session alone does not grant permission.

`createApp({ auth, services, corsOrigins, logger, rpcRouter? })` assembles HTTP behavior without reading process configuration or constructing backend clients. Its auth interface contains only request handling and session resolution. `ApiServices` contains a readonly `database: Database`, `getCache(): Promise<Cache | null>`, and `getStorage(): ObjectStorage | null`. `createRpcMiddleware(services, router?)` creates a handler per app, defaulting to the public router. Tests provide in-memory auth and fake services and call Hono's `app.request()` directly; the optional `rpcRouter` enables context checks without public demo procedures. CORS, session state, and capabilities are scoped to each application instance; evlog's standalone logger remains process-wide.

Only `server.ts` and the Nitro lifecycle plugin import `src/runtime.ts`. Other modules accept configuration or dependencies explicitly. `loadApiConfig(env)` captures configuration once; later process environment changes do not alter the running application's origins or backend settings. Enabled S3 requires all connection fields at startup, while connections remain lazy.

The resource owner exposes a guarded `database` getter alongside `getCache()` and `getStorage()`. `server.ts` passes the owner itself as `services`, retaining the database getter's shutdown guard. Procedures use `context.services.database`, `await context.services.getCache()`, or `context.services.getStorage()`; do not import the process runtime there. Optional capabilities return `null` when disabled and surface backend failures to callers. Database access reuses the lazy pool without connecting until a query runs. `close()` runs every disposer, reports aggregated failures, returns the same shutdown promise on repeated calls, and prevents new handles from being created. All three accessors fail once closing begins, including after shutdown completes. Previously borrowed handles are not revoked and follow the underlying client's shutdown behavior. Nitro delegates to `close()` after request processing stops. Register new process-owned resources and cleanup together in `src/resources.ts`.

## Logs and verification

Use `c.get("log")` in Hono and `context.log` in RPC. Enrich the existing event; do not emit a second event per request or log credentials and full request bodies. See [logger](../../packages/logger/README.md).

```sh
bun run check
bun run test:api
bun run build:api
E2E_DATABASE_URL=postgresql://.../voidmix_e2e bun run test:e2e -- --project=api
```

API production output is `.output`, started with Bun. [Architecture](../../docs/architecture.md) explains proxying and device authentication; [deployment](../../deploy/README.md) explains migrations before startup.

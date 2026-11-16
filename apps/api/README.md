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
| `server.ts`                       | Compose Hono, middleware ordering, and routes                                  |
| `vite.config.ts`                  | Nitro Bun preset, server entry, shutdown plugin                                |
| `src/routes`                      | Health, auth mounting, and RPC implementations                                 |
| `src/middleware`                  | Request events, errors, CORS, session resolution, RPC adaptation/authorization |
| `src/lib/env.ts`                  | Required values and comma-separated lists                                      |
| `src/lib/database.ts`             | Process-owned PostgreSQL pool and shutdown                                     |
| `src/lib/auth.ts`                 | Better Auth instance with the shared database                                  |
| `src/lib/cache.ts` / `storage.ts` | Optional lazy process-local clients                                            |
| `src/lib/logger.ts`               | Initialize the application's log configuration                                 |
| `src/lib/context.ts` / `orpc.ts`  | Transport context and logged contract implementer                              |
| `src/plugins/resources.ts`        | Close every owned resource when Nitro shuts down                               |

## Request flow

Logging wraps all responses, including preflights and errors. `GET /health` returns `{ "status": "ok" }` without querying infrastructure. `/api/auth/*` delegates to Better Auth. `/api/rpc/*` resolves the current session and passes headers, session, and the request logger to oRPC. Public `greet` accepts a trimmed 1–80 character name; `me` uses `requireSession`.

Add HTTP routes in `src/routes` and register them in `server.ts`. Add RPC input/output to `packages/api/src/contract.ts` first, then implement it in `src/routes/rpc.ts`. Keep business authorization in the procedure or its middleware; a resolved session alone does not grant permission.

Reuse `getCache()` and `getStorage()` from `src/lib`. They return `null` when disabled and surface backend failures to callers. The resource plugin closes PostgreSQL, Redis, and storage after request processing stops; register new process-owned resources there.

## Logs and verification

Use `c.get("log")` in Hono and `context.log` in RPC. Enrich the existing event; do not emit a second event per request or log credentials and full request bodies. See [logger](../../packages/logger/README.md).

```sh
bun run check
bun run build:api
E2E_DATABASE_URL=postgresql://.../voidmix_e2e bun run test:e2e -- --project=api
```

API production output is `.output`, started with Bun. [Architecture](../../docs/architecture.md) explains proxying and device authentication; [deployment](../../deploy/README.md) explains migrations before startup.

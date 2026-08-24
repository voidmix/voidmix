# @voidmix/api-runtime

## Purpose

The server-side API adapter shared by the Web host and the temporary standalone
API host. It composes Hono, oRPC, Better Auth, mail, and the database without
depending on Nitro or an application.

## Interface

| Path    | Purpose                                                        |
| ------- | -------------------------------------------------------------- |
| `.`     | `createApiApp`, `createApiRuntime`, runtime and option types   |
| `./env` | `apiRuntimeEnv` and the validated runtime environment contract |

## Ownership

- Own Hono routes, oRPC procedure handlers, permission enforcement, session
  resolution, CORS, Better Auth composition, and production repository wiring.
- Own no domain rule, wire schema, deployment listener, or Nitro lifecycle.

## Constraints

- Hosts create one memoized runtime per process and close it from their own
  lifecycle hook. Never connect to PostgreSQL per request.
- The package must not read an application env module or initialize the global
  logger. Request adapters receive an explicit `api` logger config.
- Keep `/api/auth/*`, `/rpc/*`, and `/health` stable. Protected procedures must
  call `requirePermission` and retain ordinary-user rejection coverage.
- Hono logs non-RPC requests and oRPC logs `/rpc/**`; preserve one wide event
  per request and never log credentials or session tokens.
- Keep the header session resolver as an explicit development/test seam. The
  production runtime always uses Better Auth and rejects suspended users.

See [`../../skills/voidmix-infra/references/orpc-procedures.md`](../../skills/voidmix-infra/references/orpc-procedures.md)
for procedure changes.

## Verification

```bash
bun run --cwd packages/api-runtime check
bun run --cwd packages/api-runtime test
bun run --cwd packages/api-runtime test:integration
```

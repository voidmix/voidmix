# @voidmix/api

## Purpose

The standalone Nitro API application and the only HTTP composition root.

## Interface

```text
server/
  api/                 Hono, oRPC, auth, module composition, and API env
  app.ts               Nitro entry delegating to the API runtime
  env.ts               host-specific environment composition (AUTH_URL 3002)
  runtime.ts           memoized runtime and close boundary
  runtime.plugin.ts    startup validation and shutdown hook
```

## Ownership

- Own port 3002, the standalone Node artifact, Docker/Railway compatibility,
  and host lifecycle wiring.
- Own the HTTP host lifecycle and API composition. Domain commands stay in
  `@voidmix/application` and `@voidmix/core`; persistence stays in `@voidmix/db`.

## Constraints

- Never import Web, Desktop, Worker, or renderer code.
- Initialize exactly one runtime per process and close it idempotently through
  Nitro's `close` hook.
- Keep the standalone `AUTH_URL` default at `http://localhost:3002`; production
  must provide its public URL explicitly.
- Preserve `/api/auth/*`, `/rpc/*`, and `/health` as stable public endpoints.
- Configure the process logger once with service `api`; request logging is
  configured by the shared runtime.
- Keep all Nitro host wiring under `server/`; `src/` is not a runtime source tree.

## Verification

```bash
bun run --cwd apps/api check
bun run --cwd apps/api test
bun run --cwd apps/api build
```

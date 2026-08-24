# @voidmix/api

## Purpose

The temporary standalone Nitro compatibility host for `@voidmix/api-runtime`.
It remains independently deployable while Web is the default API host.

## Interface

```text
server/
  app.ts               Web-format Nitro entry delegating to the shared runtime
  env.ts               host-specific environment composition (AUTH_URL 3002)
  runtime.ts           memoized runtime and close boundary
  runtime.plugin.ts    startup validation and shutdown hook
```

## Ownership

- Own port 3002, the standalone Node artifact, Docker/Railway compatibility,
  and host lifecycle wiring.
- Own no Hono route, oRPC procedure, auth adapter, session mapping, domain rule,
  or database composition; those belong to `@voidmix/api-runtime`.

## Constraints

- Never import Web or duplicate runtime code from `@voidmix/api-runtime`.
- Initialize exactly one runtime per process and close it idempotently through
  Nitro's `close` hook.
- Keep the standalone `AUTH_URL` default at `http://localhost:3002`; production
  must provide its public URL explicitly.
- Preserve `/api/auth/*`, `/rpc/*`, and `/health` for compatibility consumers.
- Configure the process logger once with service `api`; request logging is
  configured by the shared runtime.
- Keep all Nitro host wiring under `server/`; `src/` is not a runtime source tree.

## Verification

```bash
bun run --cwd apps/api check
bun run --cwd apps/api test
bun run --cwd apps/api build
```

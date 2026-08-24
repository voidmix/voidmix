# @voidmix/logger

## Purpose

The observability seam. It wraps Evlog so every surface shares naming,
environment detection, minimum levels, event shape, and redaction policy.

## Interface

| Path       | Purpose                                                            |
| ---------- | ------------------------------------------------------------------ |
| `.`        | `createLoggerConfig`, `configureLogger`, `logger`, and event types |
| `./env`    | the logger environment preset                                      |
| `./client` | `initClientLogger` and `log` for browser surfaces                  |
| `./hono`   | `evlog({...})` Hono middleware                                     |
| `./orpc`   | `evlog()`, `withEvlog`, `useLogger` for oRPC                       |
| `./vite`   | the Vite plugin integration                                        |

## Ownership

- Own logger configuration, the wide-event shape, adapter integrations, and the
  central redaction policy.
- Own **operational** logs only. Durable Admin audit records are product data
  owned by `@voidmix/domain` and `@voidmix/db`; logs are observability data. Keep
  the two separate.

## Constraints

- Node services call `configureLogger({ service })` **once** during startup.
- Scoped work uses `logger({ operation })`, enriches with `.set({...})`, and must
  call `.emit()`. **Forgetting `.emit()` silently drops the event.**
- Adapters emit **one wide event per request** carrying duration, request ID,
  actor, authorization result, outcome, and status. Enrich that event; do not add
  a second log line for the same request.
- Never configure a logger locally in an application or package, and never use
  `console.log`. Import from here.
- **Never log credentials, cookies, authorization headers, passwords, secrets,
  tokens, or API keys.** The `sensitivePaths` list in `src/index.ts` is the single
  source of truth for redaction, including its `**.`-prefixed variants. Extend it
  there rather than redacting at a call site.
- Tooling may pass an explicit `runtimeEnv` when configuration must use a copied
  child environment instead of global `process.env`.
- Depend only on `@voidmix/env` and `evlog`.

## Verification

```bash
bun run --cwd packages/logger check
bun run --cwd packages/logger test
bun run --cwd packages/api-runtime test:integration   # one event per request
```

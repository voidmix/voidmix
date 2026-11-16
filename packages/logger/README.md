# @voidmix/logger

Shared server logging with evlog. Applications configure it once; Hono owns one event per request and oRPC enriches that event instead of creating another logger.

## Application and job usage

```ts
import { configureLogger, createLogger, log } from "@voidmix/logger"

configureLogger("voidmix-worker")
log.info({ action: "worker.started" })

const job = createLogger({ job: { type: "sync" } })
try {
  job.set({ processed: 12 })
} catch (error) {
  job.error(error instanceof Error ? error : String(error))
  throw error
} finally {
  job.emit()
}
```

Use `log` for standalone infrastructure/startup events and `createLogger` for a task with a defined lifetime. Shared business libraries should accept a logger rather than reinitializing process configuration. `configureLogger(service, { drain })` supports an application-selected evlog drain; terminal output is the default.

## Request lifecycle

The API registers request IDs, evlog, and status severity before CORS, auth, and routes. Events include service, environment, request ID, method, path, status, and duration. `X-Request-Id` is returned to clients; valid incoming IDs survive, while invalid or oversized IDs are replaced.

4xx responses log at `warn`, 5xx at `error`. Intentional HTTP exceptions preserve their responses; unexpected failures produce a generic 500. oRPC adds its operation and captures errors on the same event. Auth context records only whether a session exists. CORS exposes the request ID, and Web proxies preserve it.

Use `c.get("log")` in Hono, `context.log` in oRPC, or request-scoped `useLogger()` from `@voidmix/logger/hono` in asynchronous business code. Request middleware owns emission; handlers must not manually emit a second event. Independent jobs own their own `createLogger()` lifecycle.

## Configuration and data handling

| Variable     | Default                                  | Values                                             |
| ------------ | ---------------------------------------- | -------------------------------------------------- |
| `LOG_LEVEL`  | `info`                                   | `trace`, `debug`, `info`, `warn`, `error`, `fatal` |
| `LOG_FORMAT` | Development: `pretty`; otherwise: `json` | `pretty`, `json`                                   |

Invalid values fail startup. Levels filter both simple logs and wide events; evlog fatal events remain enabled. Turbo and Docker pass these runtime settings to the API. Containers emit JSON for collection from stdout/stderr.

Redaction is always enabled for nested passwords, tokens, cookies, authorization, S3 credentials, device codes, and built-in sensitive patterns such as email, JWT, and URL passwords. Request bodies, queries, and headers are not automatically captured. Enrich events with selected operational fields rather than complete user, session, or environment objects; redaction cannot infer every sensitive business field.

## Verification

```sh
bun run test:logger
bun run check
```

Package tests exercise JSON output, redaction, configuration, concurrent request isolation, and shared Hono/oRPC emission through the public logging adapters. They do not import API code. Application-specific level handling, request IDs, and HTTP errors are tested through `createApp` by `bun run test:api`.

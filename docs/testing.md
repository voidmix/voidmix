# Testing and verification

## Choose the narrowest useful check

| Check                  | What it verifies                                                                     | Infrastructure                    |
| ---------------------- | ------------------------------------------------------------------------------------ | --------------------------------- |
| `bun run check`        | Lint, formatting, workspace structure, TypeScript, generated routes/bindings, Go vet | None                              |
| `bun run test:scripts` | Environment file protection, command plans, process behavior, workspace policies     | Temporary files and processes     |
| `bun run test:logger`  | JSON, redaction, request isolation, shared Hono/oRPC adapters                        | None                              |
| `bun run test:api`     | HTTP factory, auth/CORS ordering, authorization, request logging, config, shutdown   | None                              |
| `bun run test:go`      | Keyring ownership, restore, cancellation, failure revocation, races                  | Go HTTP fixtures and fake keyring |
| `bun run test:cache`   | Real Redis JSON, TTL, isolation, failures                                            | Explicit test Redis               |
| `bun run test:storage` | Real S3 JSON/binary, headers, metadata, paging, scoped deletion, failures            | Explicit test S3                  |
| `bun run check:mobile` | Expo dependency and SDK compatibility                                                | None                              |
| `bun run build`        | All application production assets                                                    | None                              |
| `bun run test:e2e`     | Built browser, HTTP, auth, and CLI flows                                             | Explicit test PostgreSQL          |

Bun test fits the existing server helpers and repository tools: they run on Bun and need real timers, filesystem, processes, or backend services. Playwright covers browser behavior and HTTP integration; Go uses its native test and race tools. Add Vitest if a future requirement needs its specific Vite transformations or test ecosystem. There is no parallel test runner configuration to maintain today.

API tests import `src/app.ts`, not `server.ts` or `src/runtime.ts`. They supply an in-memory auth adapter and explicit logger/origin settings, then use Hono's in-process request interface. This covers the real middleware and RPC implementation without a PostgreSQL connection or environment mutation. Resource tests use unreachable endpoints to verify lazy construction, owner isolation, and repeated/failing shutdown. They do not replace E2E coverage of Better Auth and the real database.

## Browser, API, and CLI E2E

```sh
bun run test:e2e:install
# Create a dedicated database once; this example uses the local development PostgreSQL service.
docker compose exec postgres createdb -U voidmix voidmix_e2e
E2E_DATABASE_URL=postgresql://voidmix:voidmix@127.0.0.1:5432/voidmix_e2e bun run test:e2e
```

E2E setup migrates only `E2E_DATABASE_URL`; it never falls back to `DATABASE_URL`. Tests create real accounts and sessions. Use a disposable test database. The production apps are built through Turbo, then Playwright starts four isolated servers on ports 4310–4313 and stops them afterwards. Running development servers are not reused. Expo's public API URL is set to the test API at build time.

| Project           | Coverage                                                                            |
| ----------------- | ----------------------------------------------------------------------------------- |
| `chromium`        | Web SSR, counters, browser RPC                                                      |
| `mobile-chromium` | The same Web app with a mobile viewport/device profile                              |
| `api`             | Direct/proxied RPC, validation, CORS, auth, device grants, revocation               |
| `cli`             | Built CLI subprocesses against the real API, JSON, precedence, exit codes, timeouts |
| `expo-web`        | Expo Web interactions, cross-origin RPC, network recovery, auth popup/cancel        |
| `desktop-web`     | Static SPA shell, client startup, route fallback/refresh, simulated MyGo bridge     |

```sh
bun run test:e2e -- --project=api
bun run test:e2e -- --project=desktop-web
bun run test:e2e:ui
bun run test:e2e:report
```

Keep `E2E_DATABASE_URL` available for filtered runs too. JavaScript-disabled tests verify that Web HTML contains the SSR result. Desktop tests assert that the raw shell contains no rendered app and that client startup emits no page errors. The simulated bridge tests generated IPC calls, not a native WebView or Go runtime.

Config and specs live in [tests/e2e](../tests/e2e/README.md). Failures retain screenshots and traces under `tests/e2e/test-results`; HTML reports live under `tests/e2e/playwright-report`. Both are ignored. CI installs Chromium and system dependencies, limits workers, retries twice, and uploads reports for seven days.

## Redis and S3 integration

```sh
TEST_REDIS_URL=redis://127.0.0.1:6379/1 bun run test:cache

TEST_S3_ENDPOINT=http://127.0.0.1:9000 \
TEST_S3_BUCKET=voidmix \
TEST_S3_REGION=us-east-1 \
TEST_S3_ACCESS_KEY_ID=voidmix \
TEST_S3_SECRET_ACCESS_KEY=voidmix-local-storage \
bun run test:storage
```

These suites require explicitly supplied test variables, use unique namespaces, and clean only their own keys or objects. They do not fall back to runtime `REDIS_URL` or `S3_*`. Storage tests include more than 1,000 objects to exercise pagination and bounded batch deletion. See the [cache](../packages/cache/README.md) and [storage](../packages/storage/README.md) guides.

## Native and deployment verification

Browser tests cannot establish native behavior. After changing native integration, build the real MyGo application and exercise its WebView, keyring, cancel/reopen, and sign-out flow. Test Expo deep links, SecureStore, browser return, and lifecycle on an emulator or device using a development build.

The Docker workflow builds real Linux images, runs an isolated deployment, checks API health and readiness, Web SSR, RPC, migrations, cookie forwarding, and session revocation, then removes only that test deployment. The [deployment guide](../deploy/README.md) documents its smoke-test variables.

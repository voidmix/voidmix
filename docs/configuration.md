# Configuration

## Ownership and loading

Run project commands from the repository root. Bun loads root `.env`; Turbo passes the listed runtime variables to application tasks. App-specific public build variables may live in the app's `.env`. Environment values injected by the process take precedence. Do not put secrets in `VITE_*` or `EXPO_PUBLIC_*`: those values are compiled into client assets.

```sh
bun run env:init                 # Create .env and generate BETTER_AUTH_SECRET
bun run env:init --dry-run       # Preview without writing
bun run doctor                  # Validate toolchain and configuration, without connecting
```

Existing files are preserved, including during concurrent initialization. New environment files use `0600` on POSIX systems. Fill new fields manually from the relevant example when an existing file predates them. Docker deployment has a separate `deploy/.env`, initialized by `docker:init`.

## Server configuration

| Variable                                    | Owner                  | Meaning                                                                    |
| ------------------------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| `DATABASE_URL`                              | API and migration job  | PostgreSQL URL; configure runtime TLS as required by the database provider |
| `BETTER_AUTH_URL`                           | API auth               | Device-reachable public Web origin, such as `https://app.example.com`      |
| `BETTER_AUTH_SECRET`                        | API auth               | Random secret of at least 32 characters                                    |
| `AUTH_TRUSTED_ORIGINS`                      | API auth               | Additional trusted browser origins, comma-separated                        |
| `CORS_ORIGINS`                              | API HTTP               | Origins allowed to call the API directly, comma-separated                  |
| `API_ORIGIN`                                | Web server             | Internal API origin; defaults to `http://127.0.0.1:3002`                   |
| `API_PORT`                                  | API scripts            | API port; defaults to `3002`                                               |
| `API_HOST`                                  | API development script | Development bind address; defaults to loopback                             |
| `WEB_HOST`                                  | Web development script | Development bind address; defaults to loopback                             |
| `PORT` / `HOST`                             | Production server      | Web listen settings; API's script maps `API_PORT` to `PORT`                |
| `REDIS_URL`                                 | API                    | Optional `redis://` or `rediss://` URL; empty disables cache               |
| `S3_BUCKET`                                 | API                    | Enables object storage when set                                            |
| `S3_ENDPOINT`                               | API                    | HTTP(S) S3-compatible endpoint                                             |
| `S3_REGION`                                 | API                    | S3 signing region                                                          |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | API                    | Server-only S3 credentials                                                 |
| `S3_PREFIX`                                 | API                    | Non-empty object namespace; API defaults to `voidmix`                      |
| `LOG_LEVEL`                                 | API                    | `trace`, `debug`, `info`, `warn`, `error`, or `fatal`; default `info`      |
| `LOG_FORMAT`                                | API                    | `pretty` or `json`; defaults to pretty in development, JSON otherwise      |

The API runtime calls `loadApiConfig(process.env)` once at startup. The configuration function itself has no process or infrastructure side effects; routes and middleware receive its values through application composition. Restart the API after changing runtime settings.

Auth configuration is required at server startup. PostgreSQL connects on first use. Redis and S3 are optional and connect only when used. If S3 is enabled, all S3 connection fields are required at startup, even before the first storage operation. Shared library factories take configuration explicitly rather than reading `.env` themselves.

CORS defaults allow local Expo Web origins outside production. An explicit empty `CORS_ORIGINS` disables that list. Auth origin validation remains enabled in all environments; development additionally trusts local Web and Expo Web origins. CORS permission and authentication trust are distinct settings.

## Client and tooling configuration

| Variable              | Owner                    | Meaning                                                 |
| --------------------- | ------------------------ | ------------------------------------------------------- |
| `VITE_API_URL`        | Desktop build            | Public API origin; production requires HTTPS            |
| `EXPO_PUBLIC_API_URL` | Expo build/Metro         | Public API origin; rebuild or restart after changes     |
| `VOIDMIX_API_URL`     | CLI runtime              | API base URL; overridden by `--api-url`                 |
| `DESKTOP_PORT`        | Desktop static preview   | Default `1420`                                          |
| `MOBILE_PORT`         | Expo static preview      | Default `8081`                                          |
| `LOCAL_S3_ENDPOINT`   | Local bucket initializer | Loopback HTTP endpoint; default `http://127.0.0.1:9000` |

For physical devices, set `BETTER_AUTH_URL` to the computer's reachable Web address and `EXPO_PUBLIC_API_URL` to its reachable API address. `dev:mobile` binds Web and API to `0.0.0.0`. A phone's `localhost` does not address the development computer.

## Ports

| Entry point      | Development     | E2E                         |
| ---------------- | --------------- | --------------------------- |
| Web              | `3000`          | `4310`                      |
| Expo Web / Metro | `8081`          | `4311`                      |
| API              | `3002`          | `4312`                      |
| Desktop SPA      | `1420`          | `4313`                      |
| PostgreSQL       | `5432`          | Explicit `E2E_DATABASE_URL` |
| Redis            | `6379`          | Explicit `TEST_REDIS_URL`   |
| S3 / console     | `9000` / `9001` | Explicit `TEST_S3_*`        |

`compose.yaml` binds local infrastructure to loopback. PostgreSQL and S3 persist in named volumes; Redis is a disposable 128 MB LRU cache without persistence. The `*:down` convenience commands stop their services and retain volumes.

## Turbo and deployment

When adding configuration, update its owner, the `.env.example`, this guide, and the relevant Turbo task's environment list. Build-time public variables must participate in the build hash. Runtime secrets belong in `passThroughEnv`, never in generated client code.

Production Web/API outputs are `.output`; desktop output is `dist/client`; Expo output is `dist`; CLI JavaScript output is `dist`. [Docker deployment](../deploy/README.md) documents its independent credentials, image targets, networking, and initialization jobs.

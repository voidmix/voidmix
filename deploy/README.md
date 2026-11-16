# Docker deployment

The root Dockerfile provides `web`, `api`, `migrate`, and `storage-init` targets. Bun multi-stage builds and Turbo prune produce non-root runtime images containing built artifacts. The host needs Docker and Compose v2, not Node.js or Go. Native apps and CLI use their own packaging flows.

For a managed platform instead of a single host, see [Railway deployment](railway/README.md) or [Kubernetes deployment](../infra/README.md).

## Start

```sh
bun run docker:init
# Edit deploy/.env; public deployments need a public HTTPS Web origin.
bun run docker:up
bun run docker:status
```

These bootstrap/management commands use Bun built-ins and do not require installation first. Initialization creates independent random auth, PostgreSQL, Redis, and S3 secrets and preserves existing configuration. `deploy/.env` is ignored by Git and Docker's build context.

Default Web/API URLs are `http://localhost:3000` and `http://localhost:3002`, both bound to host loopback. The default project is `voidmix-deploy`, separate from development configuration and data.

Without Bun, copy `.env.example` to `.env` in this directory, fill all four empty secrets independently with `openssl rand -hex 32`, then run from the repository root:

```sh
docker compose --env-file deploy/.env -f compose.deploy.yaml up -d --build --wait --wait-timeout 180
docker compose --env-file deploy/.env -f compose.deploy.yaml ps --all
```

## Services and configuration

| Service      | Responsibility                                                                   |
| ------------ | -------------------------------------------------------------------------------- |
| Web          | Start SSR and same-origin proxy to `http://api:3002`                             |
| API          | Nitro/Hono/oRPC and auth; waits for migrations, bucket initialization, and Redis |
| migrate      | Apply Drizzle SQL after PostgreSQL is healthy, then exit                         |
| storage-init | Create or confirm the bucket after S3 is healthy, then exit                      |
| postgres     | PostgreSQL 17 with a named data volume                                           |
| redis        | Password-protected 128 MB LRU cache without persistence                          |
| s3           | RustFS with a named object-data volume                                           |

Backend infrastructure is internal to the Compose network. `Exited (0)` is the expected state for successful initialization jobs.

| `deploy/.env` field                     | Meaning                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `BETTER_AUTH_URL`                       | Public Web origin, such as `https://app.example.com`, without `/api/auth` |
| `AUTH_TRUSTED_ORIGINS`                  | Additional trusted auth origins                                           |
| `CORS_ORIGINS`                          | Browser origins calling the API directly                                  |
| `WEB_BIND_HOST` / `WEB_PORT`            | Host Web binding                                                          |
| `API_BIND_HOST` / `API_PORT`            | Host API binding                                                          |
| `S3_BUCKET` / `S3_REGION` / `S3_PREFIX` | Bucket, signing region, object namespace                                  |
| `LOG_LEVEL` / `LOG_FORMAT`              | API logging; default `info` and `json`                                    |
| `OTEL_EXPORTER_OTLP_*`                  | Optional OTLP/HTTP log export; headers may carry credentials              |
| `COMPOSE_PROFILES` / `PROXY_WEB_DOMAIN` | Enable the bundled HTTPS proxy and name its certificate host              |
| `BACKUP_DIR`                            | Host directory for PostgreSQL dumps; default `deploy/backups`             |
| `DOCKER_IMAGE_PREFIX` / `IMAGE_TAG`     | Image naming; default `voidmix` and `local`                               |

Put an HTTPS reverse proxy before public endpoints. The bundled option is the `proxy` profile: set `COMPOSE_PROFILES=proxy`, `PROXY_WEB_DOMAIN` to a DNS name that resolves to the host, and `BETTER_AUTH_URL` to `https://<PROXY_WEB_DOMAIN>`, then run `docker:up`. Caddy listens on ports 80 and 443, obtains and renews the certificate, and forwards to `web:3000`; its certificates persist in the `caddy-data` volume. `deploy/Caddyfile` contains a commented site for publishing the API origin to native clients. Alternatively, a host proxy can forward to `127.0.0.1:3000`, or another container proxy can join the deployment network and forward to `web:3000`. Browser traffic normally uses Web's API proxy. Native clients also need an externally reachable HTTPS API origin, set in their build configuration.

For managed infrastructure, reuse the Dockerfile targets with an application-specific Compose/orchestration configuration and inject runtime `DATABASE_URL`, `REDIS_URL`, `S3_*`, and auth settings. Run migrations before the API; external buckets may be created independently.

## Operations

```sh
bun run docker:build
bun run docker:up
bun run docker:logs
bun run docker:status
bun run docker:backup
bun run docker:down
bun run docker:up --dry-run
```

Re-run `docker:up` after source updates. `docker:down` stops containers and keeps volumes. `docker:backup` writes a PostgreSQL dump to `BACKUP_DIR`; object data is not included. [Operations](../docs/operations.md) covers restore, upgrades, secret rotation, probes, and troubleshooting. Changing a password in `.env` does not change an already-initialized PostgreSQL role; rotate the database credential in the database too.

API logs are JSON on stdout/stderr with request IDs, severity, duration, and redaction. Collect them through the deployment platform, inspect `docker:logs`, or set `OTEL_EXPORTER_OTLP_ENDPOINT` to export them to an OpenTelemetry collector.

The container health check uses the API's `/health` liveness endpoint. `/ready` additionally verifies PostgreSQL and reports Redis; use it for load balancer rotation.

Pushing a `v*.*.*` tag runs the release workflow, which publishes the four image targets to `ghcr.io/<owner>/<repository>-<target>`. To run published images instead of building locally, set `DOCKER_IMAGE_PREFIX` and `IMAGE_TAG` to match and start with `docker compose ... up -d --no-build`.

## Isolated smoke tests

The Docker CI workflow builds real Linux images, starts a separate test deployment, checks health, readiness, SSR, RPC, migrations, cookie proxying, and session revocation, then removes only that test deployment and its volumes.

```sh
DOCKER_TEST_WEB_ORIGIN=http://127.0.0.1:14310 \
DOCKER_TEST_API_ORIGIN=http://127.0.0.1:14312 \
bun run docker:smoke
```

Start an isolated deployment on those ports first. The command accepts only loopback HTTP origins, creates a unique test account, and must target disposable test data. It is not a production health probe.

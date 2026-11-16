# Operations

Runbook for a deployed Web and API. [Docker deployment](../deploy/README.md) covers the single-host Compose stack and [Kubernetes deployment](../infra/README.md) the cluster manifests; this guide covers what is common to both.

## Health and readiness

| Endpoint          | Meaning                                            | Use for                                         |
| ----------------- | -------------------------------------------------- | ----------------------------------------------- |
| API `GET /health` | The process serves HTTP. Never contacts a backend. | Liveness, container health checks, restarts     |
| API `GET /ready`  | PostgreSQL answers a query within two seconds.     | Readiness, load balancer rotation, deploy gates |
| Web `GET /login`  | Web renders a page without calling the API.        | Web readiness                                   |
| Web `GET /`       | Web renders a page that calls the API during SSR.  | End-to-end smoke checks                         |

`/ready` returns `200 {"status":"ready","checks":{"database":"ok","cache":"ok"}}` or `503` with `"database":"unavailable"`. The cache value is `ok`, `unavailable`, or `disabled`; it is informational and never changes the status code, because Redis is an optional, disposable cache. Failure causes are written to the request's log event, not to the response. A process that has begun shutdown reports `503` so it leaves rotation while in-flight requests finish.

Do not point a liveness probe at `/ready`: a database outage would restart every API process without fixing anything.

## Logs

The API writes one JSON event per request to stdout with a request ID, status, duration, and redacted fields. `X-Request-Id` is returned to clients and preserved by Web's proxy, so a user-reported ID finds the matching event. `LOG_LEVEL` filters both simple logs and request events.

Set `OTEL_EXPORTER_OTLP_ENDPOINT` to an OTLP/HTTP collector (for example `http://collector:4318`) to also export events as OpenTelemetry logs. `OTEL_EXPORTER_OTLP_HEADERS` supplies collector credentials and is a secret; `OTEL_RESOURCE_ATTRIBUTES` adds resource attributes. Export is batched (up to 50 events or five seconds), flushed at shutdown, and independent of stdout: a collector outage is reported on stderr and drops events after retries rather than failing requests. Traces and metrics are not exported.

## Backups and restore

```sh
bun run docker:backup
```

This runs the one-shot `backup` Compose profile, which writes `voidmix-<UTC timestamp>.dump` (PostgreSQL custom format) to `BACKUP_DIR`, `deploy/backups` by default. The file is renamed into place only after `pg_dump` succeeds. The directory is ignored by Git and the Docker build context; dumps contain user data and password hashes, so copy them off the host to access-controlled storage and schedule the command with the host's scheduler. Nothing prunes old dumps.

Restore into the Compose database with the API stopped, replacing the file name:

```sh
docker compose --env-file deploy/.env -f compose.deploy.yaml stop api web
docker compose --env-file deploy/.env -f compose.deploy.yaml run --rm backup \
  pg_restore --clean --if-exists --no-owner --dbname=voidmix /backups/voidmix-20260101T000000Z.dump
bun run docker:up
```

`--clean` drops and recreates the dumped objects: it overwrites the current database. Test a restore against a disposable deployment before relying on a backup.

Object storage is not covered by this command. Back up the `s3-data` volume with the host's volume snapshots, or use the provider's versioning and replication for managed S3. Redis holds no durable data. With managed PostgreSQL, use the provider's point-in-time recovery instead.

## Upgrades and rollback

1. Take a backup.
2. Deploy the new images: `bun run docker:up` rebuilds and restarts Compose; on Kubernetes, change the overlay's image tags and `kubectl apply -k`.
3. Migrations run before the new API serves: the Compose `migrate` job, or each API pod's init container. Concurrent runs serialize on a PostgreSQL advisory lock.
4. Confirm `/ready` and a page load.

Migrations are forward-only; there are no down migrations. Rolling back means deploying the previous image against the newer schema, so make each schema change compatible with the previous release (add before use, remove in a later release). If that is not possible, restore the backup taken in step 1.

## Secret rotation

| Secret                 | Procedure                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`    | Change the role's password in PostgreSQL first, then the configuration, then restart the API               |
| `REDIS_PASSWORD`       | Change the configuration and restart Redis and the API together; cached data is disposable                 |
| `S3_SECRET_ACCESS_KEY` | Issue a new key with the provider, update the configuration, restart the API, then revoke the old key      |
| `BETTER_AUTH_SECRET`   | Update and restart the API; plan for existing sessions and pending authorizations to require a new sign-in |

Changing a value in `deploy/.env` does not change an already-initialized PostgreSQL or RustFS credential; rotate it in the service as well.

## Troubleshooting

| Symptom                                                | Likely cause and check                                                                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| API exits at startup naming an environment variable    | A required setting is missing, or S3 is enabled with incomplete fields. Run `bun run doctor`.                           |
| `/ready` returns 503                                   | PostgreSQL is unreachable or slow. Read the `readiness` field of the request's log event; check `DATABASE_URL` and TLS. |
| `/ready` reports `"cache":"unavailable"`               | Redis is down or `REDIS_URL` is wrong. Look for `cache.connect` errors. The API keeps serving.                          |
| Sign-in is rejected with an origin error               | `BETTER_AUTH_URL` is not the public Web origin, or the origin is missing from `AUTH_TRUSTED_ORIGINS`.                   |
| A browser calling the API directly fails on CORS       | Add the origin to `CORS_ORIGINS`. Pages served by Web use its same-origin proxy and need no CORS entry.                 |
| Native sign-in opens the wrong page or never completes | The device cannot reach `BETTER_AUTH_URL`, or the client was built with the wrong public API origin.                    |
| The `proxy` profile cannot obtain a certificate        | `PROXY_WEB_DOMAIN` does not resolve to the host, or ports 80 and 443 are not reachable from the internet.               |
| The API container never starts under Compose           | `migrate` or `storage-init` failed. `bun run docker:status` shows the exit code; `bun run docker:logs` the cause.       |

# Railway deployment

Railway builds Web and API from this repository and runs managed PostgreSQL and Redis beside them. It builds only the final stage of a Dockerfile and requires its own cache-mount IDs, so it cannot use the root Dockerfile's named targets. `deploy/railway/Dockerfile` mirrors those build stages and selects the image with the `IMAGE_TARGET` build argument; keep the two files aligned.

Service settings live in the Railway dashboard. Railway's `railway.json` configuration files are deprecated, so none is committed.

## Services

| Service  | Source           | Networking                                |
| -------- | ---------------- | ----------------------------------------- |
| web      | This repository  | Public domain; target port `3000`         |
| api      | This repository  | Private only: `api.railway.internal:3002` |
| Postgres | Railway database | Private                                   |
| Redis    | Railway database | Private                                   |

Give the API a public domain only when native clients or the CLI must reach it; browsers use Web's same-origin proxy.

## Variables

Reference variables keep credentials out of hand-written values: Railway resolves `${{Service.VAR}}` at deploy time.

| Service | Variable                  | Value                                            |
| ------- | ------------------------- | ------------------------------------------------ |
| both    | `RAILWAY_DOCKERFILE_PATH` | `deploy/railway/Dockerfile`                      |
| web     | `IMAGE_TARGET`            | `web`                                            |
| web     | `PORT`                    | `3000`                                           |
| web     | `API_ORIGIN`              | `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:3002`    |
| api     | `IMAGE_TARGET`            | `api`                                            |
| api     | `PORT`                    | `3002`                                           |
| api     | `HOST`                    | `::`                                             |
| api     | `DATABASE_URL`            | `${{Postgres.DATABASE_URL}}`                     |
| api     | `REDIS_URL`               | `${{Redis.REDIS_URL}}`                           |
| api     | `BETTER_AUTH_URL`         | Public Web origin, such as `https://example.com` |
| api     | `BETTER_AUTH_SECRET`      | At least 32 random characters, set by hand       |

`BETTER_AUTH_URL` is the one origin users sign in on. With only the generated domain, `https://${{web.RAILWAY_PUBLIC_DOMAIN}}` works; once Web has a custom domain, set that domain literally, because sign-in from any other origin is rejected as an invalid origin. Add further origins to `AUTH_TRUSTED_ORIGINS` only if they must also sign in.

`HOST=::` makes the API listen on IPv6 as well as IPv4, which Railway's private network requires. `PORT` is fixed so Web's `API_ORIGIN` can name it. Generate the auth secret with `openssl rand -base64 32`; rotating it signs users out. Optional settings such as `OTEL_EXPORTER_OTLP_ENDPOINT` and `S3_*` follow [configuration](../../docs/configuration.md).

## API deploy settings

| Setting            | Value                        | Why                                                    |
| ------------------ | ---------------------------- | ------------------------------------------------------ |
| Pre-deploy command | `bun db/scripts/migrate.mjs` | Applies SQL before the new deployment receives traffic |
| Healthcheck path   | `/ready`                     | A deployment goes live only once PostgreSQL answers    |

The API image carries the bundled migrator and SQL for this purpose. A failed pre-deploy command stops the rollout and leaves the previous deployment serving. Migrations are forward-only; see [operations](../../docs/operations.md).

Set Web's healthcheck path to `/login`, which renders without calling the API.

The API has no public domain, so `/ready` is not reachable from outside; Railway's healthcheck is its consumer. To check the deployment from outside, load `/` on Web (it calls the API during SSR) and confirm that `POST /api/auth/sign-in/email` with unknown credentials returns 401 rather than 500, which proves the schema exists.

## Deploys

Pushing to `main` rebuilds both services. Each build compiles both applications because they share the pruned workspace; only the selected stage is kept. To verify the Dockerfile before pushing:

```sh
docker build -f deploy/railway/Dockerfile --build-arg IMAGE_TARGET=api -t voidmix-railway:api .
docker build -f deploy/railway/Dockerfile --build-arg IMAGE_TARGET=web -t voidmix-railway:web .
```

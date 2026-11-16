# Kubernetes deployment

`infra/k8s` describes the Web and API workloads for a Kubernetes cluster with Kustomize. It reuses the Dockerfile's `web`, `api`, and `migrate` images. PostgreSQL, Redis, and S3 are **not** created here: provision managed services and inject their connection settings. For a single host with bundled infrastructure, use [Docker deployment](../deploy/README.md) instead.

```text
infra/k8s/
  base/                 Environment-neutral Deployments, Services, disruption budgets, Ingress
  overlays/example/     Namespace, image tags, hosts, generated ConfigMap and Secret
```

## Deploy

```sh
cp -R infra/k8s/overlays/example infra/k8s/overlays/production
cd infra/k8s/overlays/production
cp secrets.env.example secrets.env   # Ignored by Git and the Docker build context.
# Edit kustomization.yaml (namespace, images, hosts), config.env, and secrets.env.
kubectl kustomize .                  # Review the rendered manifests.
kubectl apply -k .
kubectl -n voidmix rollout status deployment/voidmix-api deployment/voidmix-web
```

Images come from the release workflow, which publishes `ghcr.io/<owner>/<repository>-<target>` when a `v*.*.*` tag is pushed. Set each image's `newName` and `newTag` in the overlay; prefer an immutable version or digest over a moving tag.

## What the base contains

| Resource                 | Behavior                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `voidmix-api` Deployment | Two replicas; a `migrate` init container applies SQL before the API container starts           |
| `voidmix-web` Deployment | Two replicas; calls the API through the `voidmix-api` Service                                  |
| Services                 | Cluster-internal `voidmix-api:3002` and `voidmix-web:3000`                                     |
| PodDisruptionBudgets     | Keep at least one pod of each workload during voluntary disruptions                            |
| `voidmix` Ingress        | Routes the Web host to Web and the API host to the API; the overlay sets hosts, class, and TLS |
| Probes                   | API liveness `/health`, readiness `/ready`; Web liveness on the port, readiness `/login`       |
| Security context         | Non-root UID 1000 (the image's `bun` user), no privilege escalation, all capabilities dropped  |

Every API pod runs migrations in its init container. Concurrent replicas serialize on a PostgreSQL advisory lock taken by `@voidmix/db/migrate`, so only one applies pending SQL and the others find nothing to do. Migrations are forward-only: a schema change must remain compatible with the previous API version for the duration of a rolling update.

`/ready` gates traffic on PostgreSQL only. Redis is reported in the response but does not remove a pod from the Service, because the cache is optional. Liveness never queries a backend, so a database outage makes pods unready without restarting them.

## Configuration

`config.env` becomes the `voidmix-config` ConfigMap and `secrets.env` the `voidmix-secrets` Secret; the API container reads both through `envFrom`. Kustomize appends a content hash to generated names, so changing a value rolls the pods. See [configuration](../docs/configuration.md) for every variable.

| Key                                         | Source        | Notes                                                             |
| ------------------------------------------- | ------------- | ----------------------------------------------------------------- |
| `BETTER_AUTH_URL`                           | `config.env`  | Public HTTPS **Web** origin; must match the Ingress Web host      |
| `AUTH_TRUSTED_ORIGINS` / `CORS_ORIGINS`     | `config.env`  | Additional auth origins; browser origins calling the API directly |
| `S3_ENDPOINT` / `S3_BUCKET` / `S3_REGION`   | `config.env`  | The bucket must already exist; an empty `S3_BUCKET` disables it   |
| `OTEL_EXPORTER_OTLP_ENDPOINT`               | `config.env`  | Optional OTLP/HTTP log export                                     |
| `DATABASE_URL`                              | `secrets.env` | Also read by the `migrate` init container                         |
| `REDIS_URL`                                 | `secrets.env` | Optional; empty disables the cache                                |
| `BETTER_AUTH_SECRET`                        | `secrets.env` | At least 32 random characters                                     |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | `secrets.env` | Server-only credentials                                           |

For a secret manager (External Secrets, Sealed Secrets, a CSI driver), remove the `secretGenerator` and have the manager produce a Secret named `voidmix-secrets` with the same keys. Web receives only `API_ORIGIN`; it never mounts the Secret.

Kustomize rewrites resource names but not strings inside environment values. If an overlay adds a `namePrefix` or `nameSuffix`, patch Web's `API_ORIGIN` to the renamed API Service.

## Verification limits

CI renders the example overlay with `kubectl kustomize`, which proves the manifests build. It does not apply them to a cluster: scheduling, the Ingress controller, TLS issuance, and connectivity to managed services are verified only in a real environment.

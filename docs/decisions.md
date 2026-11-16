# Decision log

Short records of choices that shape the repository, so a later change can tell a deliberate constraint from an accident. Add an entry when a decision would otherwise have to be rediscovered; update the status when one is replaced. [Architecture](architecture.md) describes the resulting structure.

## 1. One API deployment owns all backend resources

**Decision.** `apps/api` is the only process that connects to PostgreSQL, Redis, and S3. Web is an SSR application plus a same-origin proxy for `/api/auth/*` and `/api/rpc/*`.

**Why.** Browser sessions stay in first-party HttpOnly cookies without cross-site configuration, and infrastructure credentials exist in one runtime. The cost is one extra hop for browser requests.

## 2. Shared packages export TypeScript source

**Decision.** Packages expose source through explicit `package.json` subpaths and are compiled by their consumers.

**Why.** It avoids a second build and watch graph for small libraries. Subpaths keep server and browser entry points apart, which matters most for `@voidmix/auth`; `check:workspace` enforces the boundary.

## 3. Factories take configuration; the application owns lifetimes

**Decision.** Package factories never read the environment. `apps/api` loads configuration once, constructs one resource owner, and closes it at shutdown. Procedures borrow capabilities through `ApiServices` on the oRPC context.

**Why.** The same HTTP application can be instantiated in tests with fakes and no backend, and no module-level singleton can leak across instances. `src/runtime.ts` is the single place process state is created.

## 4. Native clients authenticate with the device authorization grant

**Decision.** Mobile and desktop request a device grant, the user approves it on a Web page, and only the requesting client redeems the device code. Redirect URLs carry no token.

**Why.** Credentials are entered only on the Web origin, native sessions are independent of the browser's cookie session, and each platform stores its token in its own secure store. Allowed client IDs come from one list in `@voidmix/auth/device`.

## 5. Readiness depends on PostgreSQL only

**Decision.** `/health` never touches a backend. `/ready` fails only when PostgreSQL is unavailable or shutdown has begun; Redis is reported but does not gate traffic.

**Why.** Every authenticated request needs the database, while the cache is optional and disposable. Gating on Redis would turn a cache outage into a full API outage, and probing backends from liveness would restart healthy processes during a dependency failure.

## 6. Migrations run before the API, serialized by an advisory lock, forward-only

**Decision.** A deployment applies SQL before the API serves: a one-shot Compose job, or an init container in every Kubernetes API pod. `migrateDatabase` holds a PostgreSQL session advisory lock for the run.

**Why.** The API can assume its schema exists, and replicas that start together do not race. There are no down migrations, so schema changes must stay compatible with the previous release during a rolling update.

## 7. Two deployment targets share the same images

**Decision.** `compose.deploy.yaml` is the single-host reference with bundled PostgreSQL, Redis, and S3. `infra/k8s` is a Kustomize base for clusters with managed data services. Both run the Dockerfile's targets; a version tag publishes them.

**Why.** Compose keeps a complete deployment runnable and smoke-tested in CI. Kubernetes manifests are kept provider-neutral; cloud resources themselves are not described because no target platform has been chosen.

## 8. Observability is wide events, optionally exported over OTLP

**Decision.** The API emits one redacted JSON event per request to stdout. Setting `OTEL_EXPORTER_OTLP_ENDPOINT` additionally exports events as OpenTelemetry logs.

**Why.** Stdout works with every platform's collector and needs no configuration. OTLP reuses the same events without a second instrumentation layer. Traces and metrics are not implemented.

## Open questions

- **Authentication rate limiting behind the Web proxy.** Web forwards browser requests to the API without establishing a trusted client address, so IP-keyed limits on `/api/auth/*` cannot distinguish clients reliably, and an in-memory counter is per replica. Fixing this needs a decision on the trusted proxy chain (ingress, Web, API) and a shared counter store such as Redis.
- **Email and background jobs.** No package exists for either. Password reset and email verification need a mail capability and Web pages; add them with their first consumer instead of as empty packages.

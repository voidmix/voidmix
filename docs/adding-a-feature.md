# Adding a feature end to end

A walkthrough of the path a server-backed feature takes through the workspaces, in dependency order. Each step names its owner; [architecture](architecture.md) explains why the boundaries sit where they do. The snippets use a hypothetical `notes` feature and are illustrative, not part of the codebase.

## 1. Schema (`packages/db`)

Add a table under `packages/db/src/schema` and re-export it from `schema/index.ts`.

```sh
bun run db:generate --name=add_notes   # Writes SQL, journal, and snapshot; does not connect.
bun run db:migrate                     # Applies to the explicitly configured DATABASE_URL.
```

Commit the SQL together with its Drizzle journal and snapshot, and never edit an applied migration. Deployments apply migrations before the API starts and cannot roll them back, so keep each change compatible with the previously released API.

## 2. Contract (`packages/api`)

Define input, output, and typed errors in `packages/api/src/contract.ts` before writing the implementation. The contract is the only thing clients share with the server, so keep it free of server imports.

```ts
notes: {
  list: oc
    .errors({ UNAUTHORIZED: { message: "请先登录。" } })
    .output(z.array(z.object({ id: z.string(), title: z.string() }))),
},
```

## 3. Procedure (`apps/api`)

Implement the contract in `apps/api/src/routes/rpc.ts`. Procedures receive request state and borrowed backend capabilities through oRPC context; they never import `src/runtime.ts`.

```ts
notes: {
  list: api.notes.list.use(requireSession).handler(async ({ context }) => {
    const { database } = context.services
    return database
      .select({ id: note.id, title: note.title })
      .from(note)
      .where(eq(note.userId, context.session.user.id))
  }),
},
```

| Capability                          | Behavior                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `context.services.database`         | The process's Drizzle handle. Connects on first query.                                   |
| `await context.services.getCache()` | Redis client, or `null` when `REDIS_URL` is unset. Failures reject: decide the fallback. |
| `context.services.getStorage()`     | Prefix-scoped S3 handle, or `null` when `S3_BUCKET` is unset.                            |
| `context.session`                   | Resolved once per request; non-null only after `requireSession`.                         |
| `context.log`                       | The request's log event. Add selected fields; do not emit a second event.                |

A resolved session is authentication, not authorization: check ownership in the query or the procedure. Declare every package a file imports in `apps/api/package.json` (for example `drizzle-orm` for query operators); `check:workspace` rejects undeclared imports.

A new process-wide resource is a different change: construct it in `createApiResources`, register its cleanup in the same place, add it to `ApiServices`, and document its shutdown behavior.

## 4. Configuration

A new server setting belongs in `loadApiConfig(env)` in `apps/api/src/config.ts`. Update the root `.env.example`, [configuration](configuration.md), the `passThroughEnv` lists in `turbo.json`, `deploy/.env.example` with `compose.deploy.yaml`, and the Kubernetes overlay's `config.env` or `secrets.env.example`. Never expose a secret through `VITE_*` or `EXPO_PUBLIC_*`.

## 5. Clients

| Client  | How it calls the procedure                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------ |
| Web     | `orpc` from `apps/web/src/lib/orpc.ts`, in a route loader or component; SSR forwards credentials per request |
| Mobile  | `getApiClient()` from `apps/mobile/src/lib/api.ts`, which attaches the stored Bearer token                   |
| CLI     | `createApiClient` with the command's origin and deadline, as in `apps/cli/src/commands/greet.ts`             |
| Desktop | The SPA calls a Go method through generated IPC; Go performs the credentialed HTTP request                   |

Shared DOM components go in `packages/ui`; mobile shares the contract and protocol helpers, not components.

## 6. Tests

| Change                            | Test                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| Validation, authorization, errors | `apps/api/tests` through `createApp` with the in-memory auth adapter and fake services |
| A user-visible flow               | A Playwright spec in `tests/e2e/specs` against the isolated E2E database               |
| Cache or storage helper behavior  | The owning package's tests with `TEST_REDIS_URL` or `TEST_S3_*`                        |
| Native credential handling        | Go tests in `apps/desktop`                                                             |

```sh
bun run check
bun run test:api
bun run build
```

[Testing](testing.md) lists infrastructure-backed suites and the limits of simulated native checks.

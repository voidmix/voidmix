# @voidmix/client

## Purpose

The transport adapter. `createApiClient({ baseUrl, headers, fetch })` returns a
typed client generated from the shared contract, so every frontend gets API
types without duplicating them.

## Interface

| Path | Purpose                                                 |
| ---- | ------------------------------------------------------- |
| `.`  | `createApiClient`, `ApiClient`, and client option types |

## Ownership

- Own the transport wiring: base URL, headers, the injectable `fetch`, and the
  HTTP method policy needed by the oRPC beta transport plugins.
- Keep that policy limited to safe read batching/deduplication and mutation
  safety; the client type remains `ContractRouterClient<typeof apiContract>` —
  **fully generic**.

## Constraints

- **`src/index.ts` normally needs no edit when the API changes.** New procedures
  appear on `createApiClient(...)` automatically because the type is derived from
  `@voidmix/contracts`. If you find yourself adding a per-procedure method here,
  the change belongs in `@voidmix/contracts` instead.
- `fetch` is injectable and that is load-bearing: `apps/api`'s integration test
  passes the Hono app directly (`fetch: async (input, init) => app.fetch(new Request(input, init))`)
  to exercise the whole stack in-process with no network.
- Procedures are never zero-arg. `client.health({})` needs the explicit `{}`.
- Depend only on `@orpc/client`, `@orpc/contract`, and `@voidmix/contracts`.
  Never import `@voidmix/db`, `@voidmix/domain`, or any application.
- Consumers own their own headers. Do not bake actor identity, auth, or
  environment lookups into this package.

## Verification

```bash
bun run --cwd packages/client check
bun run --cwd packages/client test
bun run --cwd apps/api test:integration   # the real end-to-end exercise
```

# @voidmix/api

The shared oRPC contract and HTTP client. This package is browser-compatible and contains no backend implementation, environment loading, or database access.

## Public exports

- `@voidmix/api/contract`: Zod-validated inputs/outputs, the contract, and `ApiClient`.
- `@voidmix/api/client`: `createApiClient(url, options?)`.

```ts
import { createApiClient } from "@voidmix/api/client"

const client = createApiClient("https://api.example.com/api/rpc")
const result = await client.greet({ name: "Voidmix" })
```

Callers own the origin, timeout policy, and credential source. `headers` is a lazy getter that may return a promise; use it for per-request SSR credentials or native Bearer tokens. `credentials` defaults to `include`; cookie-independent clients can use `omit`. A custom `fetch` can add deadlines and redirect policy.

Change `src/contract.ts` before implementing a new procedure in `apps/api/src/routes/rpc.ts`. Keep runtime validation here so CLI, Web, and mobile share the same contract. The sample `greet` input trims names and requires 1–80 characters; `me` returns the authenticated user's profile.

Run `bun run check`, build the affected consumers, and run the `api` E2E project. See [architecture](../../docs/architecture.md) for transport ownership.

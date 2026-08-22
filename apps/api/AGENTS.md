# @voidmix/api

## Purpose

The backend composition root. It implements the shared contract, performs the
final authentication and authorization checks, and is never imported by a
package.

## Interface

```text
server.ts                  Nitro entry
nitro.config.ts            build and preset configuration
plugins/lifecycle.ts       startup and shutdown wide events
src/
  app.ts                   Hono app, CORS, RPCHandler mount, dev repository fallback
  router.ts                oRPC handlers, requirePermission, mapDomainError
  runtime.ts               production wiring: Postgres repository, session resolver, logger
  session.ts               SessionResolver and the development header resolver
  env.ts                   API environment composition
  app.integration.test.ts  in-process contract → client → router → domain test
```

## Ownership

- Own procedure handlers, permission enforcement, domain-error mapping, session
  resolution, CORS, and the request logging split.
- Own no business rule (that is `@voidmix/domain`) and no wire shape (that is
  `@voidmix/contracts`).

## Constraints

- **`requirePermission(context, "...")` is opt-in per handler, not middleware.**
  The `.use()` chain only wires logging. A new admin procedure without the call
  is **fully public, with no type error and no failing test.** Add the call and a
  matching "rejects ordinary users" case for every protected procedure.
- `mapDomainError`'s switch is exhaustive with no `default`, so a new
  `DomainError` code is a compile error here. Add the `case`.
- The whole router is mounted as one `RPCHandler` at `/rpc/*`. Individual
  procedures need no route entry.
- The Fetch handler enables beta request/response compression,
  request/response headers, a 1 MiB request-body limit, safe GET reads with
  CSRF protection, batching, and a 15-second handler deadline. Keep mutations
  on POST.
- Hono evlog uses `exclude: ["/rpc/**"]` and oRPC evlog uses
  `include: ["/rpc/**"]`, producing **exactly one wide event per request**.
  Breaking that split double-logs; the integration test asserts the event count.
- Enrich the current event with `context.log?.set({ actor, target, outcome })`.
  One event per request, never multiple log lines and never `console.log`.
- A new request header must also be added to `allowHeaders` in `src/app.ts`.
  `x-voidmix-display-name` is read in `src/session.ts` but missing from that
  list — an existing gap, not a pattern to copy.
- `createHeaderSessionResolver` is the development seam for a future identity
  provider. Keep the `SessionResolver` type as the boundary so the router and
  domain do not change when the provider does.
- Audit rows are written from `@voidmix/domain` only, never from a handler.
- `exactOptionalPropertyTypes` requires conditional spread:
  `{ limit: input.limit, ...(input.query ? { query: input.query } : {}) }`.

See [`skills/voidmix-infra/references/orpc-procedures.md`](../../skills/voidmix-infra/references/orpc-procedures.md)
for the end-to-end edit order and the integration-test idiom.

## Verification

```bash
bun run --cwd apps/api check
bun run --cwd apps/api test
bun run --cwd apps/api test:integration
bun run verify                       # Nitro build plus a /health smoke check
```

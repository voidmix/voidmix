# oRPC Procedures

Use this when adding, changing, or removing a procedure on the API surface, or
when exposing new data to Web's public or Admin features.

## Ownership

- Schemas, procedures, the contract tree, and DTOs all live in the single file
  `packages/contracts/src/index.ts`. There is no `src/schemas/` and no barrel.
- Business rules and repository _interfaces_ live in `packages/core/src/index.ts`.
  The interface is owned by core; `packages/db` depends on core, never the reverse.
- Repository _implementations_ live in **both** `packages/db/src/postgres.ts` and
  `packages/db/src/memory.ts`.
- Handlers, production wiring, and the injected development fallback live in
  `packages/api-runtime/src/`. Web and `apps/api` are Nitro hosting shells only.
- `packages/client/src/index.ts` remains fully generic
  (`ContractRouterClient<typeof apiContract>`) — do not add procedure-specific
  client methods. It may be edited for protocol upgrades, transport wiring, or
  oRPC plugins; new procedures still appear on `createApiClient(...)`
  automatically.
- Browser-side Admin facades and hooks live under
  `apps/web/src/features/admin/<feature>/`.

## Order of edits

1. **Contract** — four edits in `packages/contracts/src/index.ts`: exported
   `fooSchema`; a module-private `const` procedure (camelCase verb, name differs
   from its key); registration in the `apiContract` plain nested object literal
   (not `oc.router()`); an `export type FooDto = z.infer<...>` at the bottom.
2. **Core** — add the method to the object returned by
   `createUserAdministration(...)`; extend `UserRepository` if persistence is new.
3. **Repositories** — update both implementations or `implements UserRepository`
   fails. `InMemoryUserRepository` must clone on read _and_ write so tests cannot
   mutate stored state.
4. **Handler** — add at the matching path inside `os.router({ ... })`. Nothing
   else registers it; `packages/api-runtime/src/app.ts` mounts the whole router in one
   `RPCHandler` at `/rpc/*`. New `DomainError` code → add a `case` to
   `mapDomainError`.
5. **Test** — copy the `setup()` idiom from
   `packages/api-runtime/src/app.integration.test.ts`.

## Rules

- **Apply the matching permission middleware through `.use(...)` on every
  protected procedure.** It injects a non-null principal for the handler and
  records the permission result. A new Admin procedure without it is public, so
  add unauthenticated and ordinary-user rejection coverage for each one.
- Business rules `throw new DomainError(code, message)`. Only the API layer maps
  those to transport codes, via `mapDomainError`. Its switch is exhaustive with
  no `default`, so a missing case is a compile error — let it guide you.
- Keep `packages/core` pure: its only dependency is `@voidmix/auth`, and
  `lib: ["ES2022"]` means no DOM types. No Zod, oRPC, Drizzle, Hono, or React.
- Inject `now` and `id` with defaults in core factories — that is what makes
  tests deterministic.
- `getX` returns `T | null` and never throws; mutators return the updated entity
  or `void`.
- **Dates stay native `Date` end to end**; never serialize to ISO strings.
  `z.date()` in contracts, `mode: "date"` in the Drizzle schema.
  `packages/contracts/src/index.test.ts` exists solely to lock this in.
- Audit rows are written **from `packages/core` only**, via
  `users.appendAudit(...)`, in the same logical operation as the mutation and
  only on a real state change. Never from a handler. They are durable product
  records, distinct from `@voidmix/logger` operational events.
- Enrich the current wide event with `context.log?.set({ actor, target, outcome })`
  — one event per request, not multiple log lines.
- Procedures are never zero-arg: `client.health({})` needs the explicit `{}`.
- The oRPC beta client transport uses GET for safe reads and POST for mutations;
  batching, deduplication, compression, retry-after handling, and timeouts stay
  in transport wiring rather than procedure-specific client APIs.

## Footguns

- Contract tree and router tree must match **exactly**. Adding one without the
  other is a type error deep inside `os.router()` whose message does not point at
  your edit.
- A new audit action string needs the matching declarations in
  `@voidmix/core`, `@voidmix/contracts`, and `@voidmix/db`, plus a generated
  migration.
- New request header → also add it to `allowHeaders` in
  `packages/api-runtime/src/app.ts`.
  Existing latent bug worth not replicating: `x-voidmix-display-name` is read in
  `packages/api-runtime/src/session.ts` but missing from that list.
- Web uses the same-origin `/rpc` transport; Desktop provides an absolute
  `VITE_API_URL`. Authenticated browser requests include credentials; never
  restore actor identity headers as a production authentication mechanism.
- Web's `(app)/route.tsx` session gate is navigation assistance only. Per
  `AGENTS.md`, the API performs the final check; a client-side guard never
  replaces API permission middleware.

## Verification

```bash
bun run --cwd packages/api-runtime test    # narrowest
bun run check                  # tsc --noEmit per workspace
```

The integration idiom runs contract → client → RPC → router → core →
repository in-process, with no network and no database, by handing the Hono app
to the real client as its `fetch`:

```ts
fetch: async (input, init) => app.fetch(new Request(input, init));
```

Assert errors by `code` (`rejects.toMatchObject({ code: "FORBIDDEN" })`), not by
message. Type-check every consuming app after a contract change.

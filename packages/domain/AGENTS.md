# @voidmix/domain

## Purpose

Framework-independent business rules and the repository interfaces they depend
on. This is the layer that decides what is allowed, separate from how it is
transported or stored.

## Interface

| Path | Purpose                                                                  |
| ---- | ------------------------------------------------------------------------ |
| `.`  | `src/index.ts` — entity types, `UserRepository`, `DomainError`, usecases |

## Ownership

- Own user and audit-event types, user listing with cursor pagination, status
  transitions, self-suspension and final-administrator protection, idempotent
  initial administrator creation, and durable audit-event creation.
- Own the **repository interfaces**. The dependency direction is inverted on
  purpose: `@voidmix/db` depends on this package to learn what to implement.
- Own no transport concern. Business rules throw `DomainError`; only the API
  layer maps those to transport codes.

## Constraints

- **The only dependency is `@voidmix/auth`.** No React, Hono, Nitro, Drizzle,
  Zod, or oRPC. `lib: ["ES2022"]` means there are no DOM types either.
- Entities are plain `interface`s with no methods and no classes.
- Usecases are factory functions returning an object literal
  (`createUserAdministration({ users, now, id })`), not classes.
- `now` and `id` are injectable with defaults. This is what makes tests
  deterministic — do not reach for `new Date()` or a UUID library inline.
- `DomainError` carries a **closed string-literal union** `code` as its first
  constructor argument. Adding a code is a compile error in `apps/api`'s
  `mapDomainError`, whose switch is exhaustive with no `default`. Let it guide you.
- `getX` returns `T | null` and never throws; mutators return the updated entity
  or `void`.
- **Guard ordering in `updateStatus` is load-bearing**: not-found →
  self-suspension → last-admin → no-op short-circuit → mutate → `appendAudit`.
  The no-op check comes _after_ the guards, and audit is appended only on a real
  state transition.
- Audit rows are written **here and only here**, in the same logical operation as
  the mutation. They are durable product records, distinct from `@voidmix/logger`
  operational events. Never append audit from a handler.
- A status or audit-action value is also declared in `@voidmix/contracts`
  (`z.enum`) and `@voidmix/db` (`pgEnum`). All three must change together; a
  missing one fails at runtime, not at compile time.

## Verification

```bash
bun run --cwd packages/domain check
bun run --cwd packages/domain test
bun run --cwd apps/api test        # exercises the usecases through the router
```

# @voidmix/core

## Purpose

Framework-independent business rules and the repository interfaces they depend
on. This is the layer that decides what is allowed, separate from how it is
transported or stored.

## Interface

| Path | Purpose                                                                     |
| ---- | --------------------------------------------------------------------------- |
| `.`  | `src/index.ts` — context exports, repository ports, domain errors, usecases |

## Ownership

- Own user and audit-event types, user listing with cursor pagination, status
  transitions, self-suspension and final-administrator protection, idempotent
  initial administrator creation, typed mail and authentication settings rules,
  source/inheritance models, derived public Auth capabilities, and durable
  audit-event creation.
- Own workspace membership types and the actor-plus-workspace access
  administration seam. Active owners and editors may write; active viewers
  may read. Missing memberships are denied.
- Own asset path/version/conflict invariants and Agent run/step/lease state
  machines. Repository commands that cross records declare an atomic contract;
  adapters must preserve it.
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
- `DomainError` is the common business-error base. Each bounded context owns a
  closed string-literal code union and may expose a context-specific subclass.
  Optional primitive `values` carry interpolation data for the transport error
  envelope; human-readable messages remain diagnostics and are not a UI
  localization source. Add the corresponding explicit mapping in
  `apps/api/server/api` whenever a context adds a transport-visible error code.
- `getX` returns `T | null` and never throws; mutators return the updated entity
  or `void`.
- **Guard ordering in `updateStatus` is load-bearing**: not-found →
  self-suspension → last-admin → no-op short-circuit → mutate → `appendAudit`.
  The no-op check comes _after_ the guards, and audit is appended only on a real
  state transition.
- Audit rows are initiated **here and only here**, in the same logical operation as
  the mutation. They are durable product records, distinct from `@voidmix/logger`
  operational events. Never append audit from a handler.
- Authentication settings normalize email domains to lowercase exact domains,
  reject invalid domains, and cap the allowlist at 100 entries. An empty list
  means every domain is allowed.
- Settings mutations are field-scoped: omission retains database state, `set`
  or `replace` writes an override, and `reset` removes an override so the
  repository can resolve its inherited value.
- A status or audit-action value is also declared in `@voidmix/contracts`
  (`z.enum`) and `@voidmix/db` (`pgEnum`). All three must change together; a
  missing one fails at runtime, not at compile time.

## Verification

```bash
bun run --cwd packages/core check
bun run --cwd packages/core test
bun run --cwd apps/api test   # exercises usecases through the router
```

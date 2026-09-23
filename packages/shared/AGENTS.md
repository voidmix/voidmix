# @voidmix/shared

## Purpose

Framework-independent primitives shared by domain and adapter packages. This is
the deepest common workspace in the repository.

## Interface

| Path | Purpose                                                                               |
| ---- | ------------------------------------------------------------------------------------- |
| `.`  | `src/index.ts` — domain errors, setting value types, and injectable clock/ID defaults |

## Ownership

- Own the generic `DomainError` envelope used by framework-independent business
  rules, including primitive interpolation values.
- Own setting source/mutation value types and the injectable `Clock` and
  `IdGenerator` defaults used by deterministic domain and adapter code.
- Keep the package independent from authentication, persistence, transport,
  UI, and runtime-specific libraries.

## Constraints

- **Zero dependencies.** This package sits below `@voidmix/core` and
  `@voidmix/db` in the dependency graph.
- Keep exports plain and framework-independent. Do not add React, Hono,
  Drizzle, Zod, or application-specific behavior.
- Consumers inject `now` and `id` functions in tests and use the defaults only
  at composition boundaries.
- `DomainError` carries a stable code and optional primitive values; human
  messages remain diagnostics and are not a localization source.

## Verification

```bash
bun run --cwd packages/shared check
bun run --cwd packages/shared test
```

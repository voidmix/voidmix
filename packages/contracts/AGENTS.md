# @voidmix/contracts

## Purpose

The runtime contract seam. It defines the wire shape shared by the API and every
frontend: Zod schemas, the oRPC contract tree, and the DTOs derived from them.

## Interface

| Path | Purpose                                                               |
| ---- | --------------------------------------------------------------------- |
| `.`  | `src/index.ts` — schemas, procedures, `apiContract`, and `*Dto` types |

Everything lives in that one file. There is no `src/schemas/`, no `src/dto/`,
and no barrel to update.

## Ownership

- Own the request and response shape of every procedure, and the DTO types that
  consumers import.
- Own nothing else: no network calls, no database access, no business rules.

## Constraints

- Schemas are exported (`export const fooSchema = z.object({...})`); procedure
  definitions are module-private `const`s named as camelCase verbs whose name
  differs from their key in the tree (`listUsers` → `list`).
- `apiContract` is a plain nested object literal, **not** `oc.router()`.
- DTOs are declared at the bottom as `export type FooDto = z.infer<typeof fooSchema>`.
- **Dates stay native `Date`.** Use `z.date()`; never serialize to ISO strings.
  `src/index.test.ts` exists solely to lock this in.
- The contract tree and `@voidmix/api-runtime`'s router tree must match **exactly**. Adding
  to one without the other is a type error deep inside `os.router()` whose
  message does not point at your edit.
- Public Auth capabilities expose only registration, verification-request, and
  password-reset-request booleans. Never add settings sources, domain lists,
  missing mail fields, or secret state to that public DTO.
- Settings updates use optional per-field mutation unions. Omitted fields retain
  their database state; `reset` means delete the database override, not persist
  an empty inherited value.
- **A status or audit-action value is declared in three places with no shared
  source**: the literal union in `@voidmix/core`, the `z.enum` here, and the
  `pgEnum` in `@voidmix/db`. Miss one and it fails at runtime (Zod output
  validation or a PostgreSQL enum error), not at compile time.
- Depend only on `@orpc/contract` and `zod`. Never import a runtime package.
- `exactOptionalPropertyTypes` is on repo-wide: mark optional inputs
  `.optional()` and let consumers use conditional spread rather than passing
  `undefined`.

See [`skills/voidmix-infra/references/orpc-procedures.md`](../../skills/voidmix-infra/references/orpc-procedures.md)
for the full edit order across contracts, domain, db, and the API.

## Verification

```bash
bun run --cwd packages/contracts check
bun run --cwd packages/contracts test
bun run --cwd packages/api-runtime test   # the contract's real consumer
```

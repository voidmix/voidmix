# @voidmix/auth

## Purpose

The authorization vocabulary. It defines roles, permissions, session types, and
the single grant lookup that answers whether a session may do something.

## Interface

| Path | Purpose                                                                                 |
| ---- | --------------------------------------------------------------------------------------- |
| `.`  | `roles`, `permissions`, `Role`, `Permission`, `SessionUser`, `Session`, `hasPermission` |

## Ownership

- Own the closed sets of roles and permissions, the grant table that maps one to
  the other, and the shape of a session.
- Own no session _resolution_ and no enforcement. `@voidmix/api-runtime` resolves sessions
  and calls `hasPermission`; this package only answers the question.

## Constraints

- **Zero dependencies.** This is the deepest package in the graph, imported by
  `@voidmix/domain` among others. Keep it that way.
- `roles` and `permissions` are `as const` tuples with types derived via
  `(typeof x)[number]`. Add a value to the tuple, never to a hand-written union.
- The grant table is `Record<Role, ReadonlySet<Permission>>`, so a **missing role
  is a compile error**. Every role uses an explicit permission allowlist; adding
  to `permissions` must never silently expand an existing role.
- Auth settings deliberately split read from write: Admin and Owner may read;
  only Owner may write. Keep this split when adding related procedures or UI.
- `hasPermission(session: Session | null, permission)` accepts `null` and returns
  `false` for it. Callers must still distinguish "no session" (401) from
  "insufficient role" (403); `@voidmix/api-runtime`'s `requirePermission` does that.
- Do not add session storage, token parsing, cookie handling, or an identity
  provider client here. Those belong behind `@voidmix/api-runtime`'s `SessionResolver` seam.

## Verification

```bash
bun run --cwd packages/auth check
bun run --cwd packages/auth test
bun run --cwd packages/api-runtime test:integration   # rejects a non-admin
```

# @voidmix/application

## Purpose

Application commands and queries shared by the API and asynchronous Worker.
This package coordinates domain ports from `@voidmix/core`; it owns no HTTP,
database, AI SDK, or renderer concerns.

## Interface

| Path | Purpose                                            |
| ---- | -------------------------------------------------- |
| `.`  | V2 Project commands, queries, and repository ports |

## Ownership

- Resolve Project capabilities from personal ownership, Organization membership,
  and project-level grants.
- Keep command/query orchestration independent of Hono, Drizzle, and React.
- Leave transactions, persistence, outbox delivery, and provider lifecycle to
  adapters and the hosting applications.

## Constraints

- Depend only on `@voidmix/core`.
- Use injected clock and id functions for deterministic tests.
- A Project operation always loads the Project before checking access; caller
  supplied ownership fields are never authorization input.
- Organization membership may establish a base capability; project membership
  may narrow it, never elevate it.

## Verification

```bash
bun run --cwd packages/application check
bun run --cwd packages/application test
```

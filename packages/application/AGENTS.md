# @voidmix/application

## Purpose

Application commands and queries shared by the API and asynchronous Worker.
This package coordinates domain ports from `@voidmix/core`; it owns no HTTP,
database, AI SDK, or renderer concerns.

## Interface

| Path | Purpose                                                                         |
| ---- | ------------------------------------------------------------------------------- |
| `.`  | Identity, Projects, Assets, Reviews, Activity services and narrow ProjectAccess |

## Ownership

- `index.ts` composes Projects from lifecycle, member and task commands. Assets,
  Reviews and Activity have separate factories with only their own ports.
- `identity.ts` owns user queries, status changes and initial admin creation.
  Core supplies rules, transaction ports and audit construction.
- `context.ts` exposes the narrow ProjectAccess interface for cross-domain use.
- Resolve Project capabilities from personal ownership, Organization membership,
  and project-level grants.
- Keep command/query orchestration independent of Hono, Drizzle, and React.
- Execute Identity mutations and audit append through the Core administration
  transaction port; DB implements atomicity. Outbox delivery and provider
  lifecycle remain with adapters and hosting applications.

## Constraints

- Depend only on `@voidmix/core`.
- Non-Agent ports are required; production must never substitute an empty list
  for a missing repository. Test doubles belong in explicit fixtures.
- Validate a Review asset version exists and belongs to the requested project.
  Missing and foreign resources share the existing access-denied error.
- List queries delegate visibility and pagination to repository ports. Calls
  without limit/cursor preserve complete-list behavior.
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

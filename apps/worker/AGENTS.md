# @voidmix/worker

## Purpose

The durable Agent and outbox execution host. It is a composition root for
long-running work and is never imported by Web, Desktop, or shared packages.

## Interface

| Path             | Purpose                                                 |
| ---------------- | ------------------------------------------------------- |
| `src/index.ts`   | Outbox claim/dispatch loop and lifecycle contract       |
| `src/runtime.ts` | Database-backed composition root for the worker process |

## Ownership

- Claim durable work using a lease and invoke an injected dispatcher.
- `createAgentRunDispatcher` loads queued V2 runs, persists running and terminal
  states, and invokes an injected executor. Provider composition belongs to the
  host; this module does not initialize Pi or HTTP sessions.

## Constraints

- Never read HTTP sessions or browser state.
- Never import React, route modules, or Desktop code.
- Every claimed item must either be acknowledged or have its lease expire for a
  later worker to reclaim it.
- Shutdown stops new claims and waits for currently running handlers to finish.

## Verification

```bash
bun run --cwd apps/worker check
bun run --cwd apps/worker test
```

# Voidmix domain language

This glossary records the terms that have one meaning across product, domain,
API, and client conversations. It intentionally avoids framework, storage, and
deployment details.

## People and scope

- **Actor** — the person or controlled process responsible for an action.
- **User** — a person with a Voidmix account.
- **Workspace** — the team-owned boundary for projects, assets, runs, and their
  membership rules.
- **Membership** — a user's relationship with a Workspace, including its role
  (`owner`, `editor`, or `viewer`) and access state (`active` or `suspended`).
  Active owners and editors may write; active viewers may read. A missing
  membership denies access.

## Creative work

- **Project** — a body of creative work owned by a Workspace.
- **Task** — a unit of work tracked inside a Project. A Task has its own
  lifecycle and is not a file version.
- **Asset** — the logical creative item identified by the team, such as a
  source file, image, video, or document.
- **Asset version** — an immutable snapshot of an Asset at a point in its
  history. The current version is the Asset's head.
- **Blob** — the file content referenced by an Asset version. A Blob has no
  project workflow semantics by itself.
- **Manifest** — a device's view of the Assets and versions it knows about.
- **Sync cursor** — a position in the ordered change history used to request
  changes since a previous synchronization.
- **Sync conflict** — a rejected or unresolved concurrent change where the
  submitted Asset head is no longer current.
- **Tombstone** — a retained deletion marker that allows deletion to propagate
  to other device manifests.

## Agent work

- **Agent run** — one bounded attempt to achieve a requested outcome within a
  Workspace and an explicitly granted capability scope.
- **Agent step** — a durable, ordered part of an Agent run that can be retried
  or resumed.
- **Agent lease** — a time-bounded claim by one worker to execute an Agent run;
  acquisition, takeover after expiry, and heartbeat renewal are atomic.
- **Tool invocation** — one request by an Agent step to use a named capability.
- **Agent artifact** — an Asset or other durable output produced or attached by
  an Agent run.
- **Capability** — a named permission to perform one class of operation. A
  capability is narrower than general Workspace membership.

## Records and change

- **Domain event** — a fact about a domain change used to continue internal
  work. It is not a user-facing activity record.
- **Audit event** — a durable product record of who performed a sensitive or
  consequential action and what changed.
- **Idempotency key** — a caller-provided identity for one retriable command;
  repeating it must not create a second effect.
- **Head** — the version currently accepted as the latest version of an Asset.

## Boundary terms

- **Domain** — the rules and language that decide which state transitions are
  valid.
- **Application service** — a use-case boundary that coordinates domain rules,
  persistence, audit, and external capabilities.
- **Adapter** — an implementation that connects a port to a database, storage
  provider, mail service, model provider, or another external system.
- **Transport** — the HTTP or streaming boundary that maps requests and
  responses to application services.
- **Feature** — a user-facing product capability owned by an application. A
  Feature may span transport, client, UI, and domain modules; it is not a
  directory category inside the domain by default.

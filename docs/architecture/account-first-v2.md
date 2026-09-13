# Account-first V2

> Status: accepted, September 12, 2026.

V2 starts from the Account and Project relationships rather than carrying the
old Workspace and Project Studio model forward. A user may own any number of
personal Projects. A Project has exactly one scope: a personal owner or an
Organization. `createdByUserId` records attribution and audit history; it is
not an authorization shortcut.

The domain is split into stable contexts: identity, projects, assets, reviews,
agents, and activity. API and Worker are two composition roots over the same
application commands. PostgreSQL repositories own persistence details, the
outbox connects committed commands to durable Agent work, and object storage is
used for direct blob uploads.

Project capability evaluation is centralized. Personal ownership grants
management; project members grant editor, commenter, or viewer access. For an
Organization Project, organization membership establishes the upper bound and
project membership may only narrow it. API handlers, workers, and repositories
must call the same evaluator.

The V2 schema and contracts are intentionally separate from the existing
legacy surface while the vertical slices are built. No migration or offline
synchronization protocol is part of V2. Organization tables and repository
ports are present so opening Organization later adds scope and membership
operations without changing Task, Asset, Review, or AgentRun ownership.

The next implementation slice is to complete V2 Task, Asset, Review, AgentRun,
and direct object-storage commands on the same application boundary, then make
the V2 routes the product entrypoint.

# Project Studio migration

> Status: approved migration plan, partially implemented. Baseline reviewed at
> `7109fed35e49a39380601e1b16ddb3af4e152c71` on September 8, 2026.

This document is the handoff and execution plan for changing Voidmix from a
Workspace-led collaboration product into a project-first studio for individual
creators. It records the target product, migration order, current implementation
state, and acceptance criteria. The existing architecture documents describe
the running system until each phase below lands.

## Product decision

Voidmix becomes a **Project Studio** that helps a creator move from an idea to a
finished delivery:

```text
idea or brief -> material -> AI assistance -> review -> delivery
```

The primary user is an individual creator. Collaboration remains optional and
project-scoped so it can be enabled later without redesigning the project model.
The product UI does not ask users to choose or understand a Workspace.

Workspace remains an internal tenancy and authorization boundary during this
migration. Removing or renaming that backend boundary is not part of the UI
migration and requires a separate domain and security decision. User-facing
view models, routes, copy, and navigation use Account, Project, Library, and
Studio terminology.

## Target experience

### Information architecture

Web and Desktop share these primary destinations:

```text
Home
Projects
Library
Activity
Settings
```

- **Home** resumes recent work, shows items needing review, and starts a brief.
- **Projects** lists active and archived projects with stage filters.
- **Library** contains assets, versions, references, briefs, and search.
- **Activity** is a chronological account-wide record.
- **Settings** contains account, AI, notification, sync, and device settings.

Devices moves under Settings and system status. It is not a primary product
destination. A user who signs in lands on Home without a Workspace selection
step. During the preview period, public product routes remain explicitly marked
as preview data; the entire route group moves behind the existing authenticated
layout when the live account adapter is introduced.

### Project structure

A project is the primary creative-work entity and exposes these stable sections:

```text
Overview | Brief | Canvas | Tasks | Feedback | Activity | Settings
```

Files are available in Canvas and in the account-wide Library. Pi is available
through the global composer and contextual actions; it is not a primary Project
navigation tab. A standalone session detail route remains the deep-link and
recovery surface during migration, and existing Pi session URLs remain valid.

Each project carries:

- title, description, cover and visual thumbnail;
- stage: `draft`, `in_progress`, `review`, or `delivered`;
- computed progress, deadline and last activity;
- brief and project context used by Pi;
- assets and immutable asset versions;
- feedback and review state;
- Pi sessions and generated artifacts;
- optional project members and roles.

Archive state is independent from creative stage. Archiving must not rewrite a
project's last stage.

### Pi behavior

`CommandComposer` is the single entry component for AI work.

- On Home, submitting a prompt creates a brief flow and asks for a project only
  when the command cannot be attached to an existing one.
- Inside a project, the composer receives the project, brief, selected assets,
  tasks, feedback, and previous session identifiers as explicit context.
- Task actions can create a checklist, summarize feedback, or split work.
- Asset actions can summarize content, compare versions, and prepare a review.
- Every run creates a `PiSession`; mutations are visible, cancellable, and
  recoverable. Preview and remote adapters expose the same operations.

## Visual system

The visual direction combines Aura's presentation quality with the component
discipline of Shadcn UI Kit. It should feel like a polished creative product,
not a generic administration dashboard.

- Use a warm light field near `#f7f7f5`, white working surfaces, quiet borders,
  and a near-black inverted surface for the primary action.
- Use 10–14px card radii, 8px control radii, and restrained shadows. Working
  screens rely on hierarchy and borders; the Home hero may use a soft mesh,
  grid, or glow.
- Use Bento composition on Home and predictable, denser composition inside a
  project.
- State always includes text or an icon. Color is supporting information.
- Motion communicates entry, progress, focus, expansion, or completion and
  respects `prefers-reduced-motion`.
- Both themes, keyboard focus, 390px layouts, and WCAG 2.2 AA contrast are part
  of component acceptance, not a later polish pass.

Reusable primitives belong in `@voidmix/ui` only after two application surfaces
need the same interface. Product-specific composition remains in its app.
The planned vocabulary is `ProjectCard`, `ProjectStageBadge`, `MetricCard`,
`CommandComposer`, `QuickActionCard`, `ActivityTimeline`, `ReviewSummary`,
`FilePreviewCard`, `ProgressRail`, `FilterBar`, `CommandMenu`, `EmptyState`, and
`ProjectHeader`.

## Data and compatibility

The first live boundary is an account-scoped Project Studio snapshot containing
account profile, projects, project members, assets and versions, reviews,
activities, and Pi sessions. Contracts live in `@voidmix/contracts`; Web and
Desktop access them through `@voidmix/client`. Domain rules stay in
`@voidmix/core`, and persistence remains behind core-owned repository ports.

The browser preview moves from `WorkspaceDataSource` / `WorkspaceSnapshot` to
`ProjectStudioDataSource` / `StudioSnapshot`. Introduce preview schema version 2
under `voidmix.project-studio.preview.v2` and migrate
`voidmix.workspace.preview.v1` once. Preserve projects, tasks, activity, and
sessions; derive missing stage, cover, deadline, asset, and review fields from
documented defaults. A failed migration keeps the old value intact and starts a
labelled fresh preview rather than partially restoring data.

Until live APIs exist, adapters must remain honest about preview state. A network
failure must not silently replace account data with successful sample data.

## Decisions to lock before implementation

The following decisions are part of the migration seam. Leaving them implicit
will make the Web preview, Desktop client, API contracts, and database model
drift apart.

New choices in this section and the model/runbook below are proposed execution
defaults, not additional approved product decisions. Before implementing an
affected boundary, record accepted cross-layer choices in a
[decision record](./decisions/README.md). The existing architecture remains in
force until that change lands.

| Decision                                    | Proposed direction                                                         | Must be settled before            |
| ------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------- |
| Project ownership and account aggregation   | Workspace-owned projects; account queries aggregate authorized memberships | Phase 1 contracts and persistence |
| Default tenancy and membership provisioning | Server resolves a creation context without a Workspace chooser             | First live project creation       |
| ProjectMember permissions                   | Optional project grants constrained by existing Workspace access           | Shared project access             |
| PiSession and AgentRun                      | One session projection per durable run attempt                             | Live Pi commands                  |
| Desktop offline scope                       | Retain the existing online-only boundary                                   | Settings and device controls      |

### Account, Workspace, and access

- Account is the signed-in user's product identity. Target Projects, assets,
  Agent runs, and memberships are Workspace-scoped. The current Project port
  carries only `ownerId`; Phase 1 must add canonical `workspaceId` ownership
  and define the retained creator/owner identity instead of treating the
  existing field as an already implemented tenancy relationship.
- For the first live release, Home and Library aggregate data from all active
  memberships. Project creation uses an account preference, falling back to
  the oldest active membership with write access (then membership ID to break
  ties). Existing project mutations resolve tenancy from the stored Project,
  never from the account default. Accounts with no writable context need an
  explicit provisioning or access-denied flow; the provisioning policy is a
  Phase 1 decision. A later Workspace switcher may change this rule through a
  separate decision; the UI must not expose a Workspace chooser as a
  prerequisite for Home.
- Project Studio procedures derive accessible Workspaces from the session and
  membership. A client-supplied `workspaceId` may select only an already
  authorized context, and a missing or unauthorized context returns a stable
  permission error. It must never grant access by itself. Cross-Workspace reads
  and writes need explicit denial tests.
- Project ownership, optional member roles, and the existing global role plus
  Workspace membership checks need one written permission matrix. The matrix
  should cover read, create, edit, archive, restore, asset version commit,
  feedback, and Pi actions.

### Project lifecycle and projections

- Store creative `stage` separately from archive state. Use an explicit archive
  marker and timestamp so restoring a project returns it to its previous stage.
- Proposed progress is completed tasks divided by all tasks, with `null` for
  projects without tasks. Stage changes are explicit and do not follow task
  counts automatically: `draft -> in_progress -> review -> delivered`, with
  review/delivered returning to in_progress through an explicit reopen action.
  The Home metrics and Project header use the same projection. Deadlines are
  nullable native `Date` instants stored in UTC and displayed in the selected
  account time zone; creation must preserve the time zone shown to the user.
- Record the legacy status mapping as a migration table. `archived` does not
  contain the previous stage, so its fallback must be explicit and marked as a
  default rather than presented as an inferred historical value.
- The Project Studio contract uses `title` as the canonical project field. The
  current core `name` field is a migration-era compatibility field and must be
  mapped at the adapter boundary before the live contract lands. Cover,
  thumbnail, deadline, brief, and project association also need one source of
  truth and explicit nullability.

### Assets, blobs, and Desktop sync

- Define the blob port separately from asset metadata: upload/download method,
  content type and size limits, checksum verification, failed-upload cleanup,
  and version retention. An asset version must remain immutable after commit.
- Define whether an asset belongs to one project, many projects, or a Library
  with project references. The answer affects deletion, search, permissions,
  and the Project Canvas model.
- The first Project Studio release remains cloud-backed and online-only. Sync
  settings expose connection and last-sync status; they do not imply offline
  editing. Offline manifests, cursors, tombstones, and offline conflict
  recovery require a separate decision. Device registration/revocation and
  notification delivery need their own authenticated contracts before those
  controls become interactive; offline sync is not a prerequisite for revocation.

### Pi sessions and durable runs

- `PiSession` is the user-facing projection of an `AgentRun` in the first live
  release. The session owns prompt, context, and presentation metadata; the run
  owns durable status, steps, cancellation, leases, and retry. Artifacts link to
  the session and the resulting Project or Asset version.
- Reuse the existing AgentRun state machine, including
  `waiting_for_approval` and `succeeded`, and map display labels at the adapter
  boundary. A user retry creates a new attempt linked to its predecessor;
  transport replay of the same command reuses its idempotency key. Cancellation
  is a server request with a durable outcome, not merely a disconnected stream.
  Committed effects remain visible; undo is a separate authorized command.
- Define how progress and partial results reach Web and Desktop, how a
  generated artifact is attached to a project or asset version, and what happens
  when the client disconnects while a run continues. A local preview runner
  cannot be treated as evidence for these server guarantees.

### Activity, audit, and query shape

- User-facing Activity is a product timeline with account and project scopes;
  Admin audit records remain the durable security record. Define which domain
  changes create each record, their actor and visibility rules, retention, and
  ordering when events share a timestamp.
- Define pagination and filtering for Library and Activity before the snapshot
  grows beyond preview data. The aggregate Home query can stay small, but it
  must not become the only way to retrieve projects, assets, versions, or runs.
- Specify the live adapter's error mapping for authentication, membership
  denial, stale version heads, unavailable blobs, cancelled runs, and temporary
  service failure. Every error must remain visible to the user and must never
  turn into sample data.

### Migration and rollout

- Preview schema version 2 needs an explicit old-to-new field map, an idempotent
  migration marker, and fixtures for valid, malformed, partially migrated, and
  currently running session data. Keep the v1 value until v2 has been written
  successfully; a retry must not duplicate projects, tasks, activity, or runs.
- Define the release gate for moving routes behind the authenticated layout,
  including the compatibility period for old Pi URLs and the rollback behavior
  if the live adapter or migration fails.
- Add live authorization and concurrency tests before calling a phase complete:
  cross-Workspace denial, role changes, duplicate commands, stale asset heads,
  lease takeover, Pi cancellation, retry, and client reconnect. Preview tests
  cover interaction shape only.

## Canonical model and API

The first live model keeps the existing storage tenancy while presenting an
account-level projection:

```text
User/Account 1--* WorkspaceMembership *--1 Workspace
Workspace 1--* Project 1--* Task
Project 1--* Brief
Project 1--* AssetReference *--1 Asset 1--* AssetVersion
Project 1--* Review 1--* Feedback
Project 1--* PiSession 1--1 AgentRun 1--* AgentStep
Project 1--* Activity; Account 1--* Activity
```

Target Project storage is Workspace-owned. `ProjectMember` is
optional and project-scoped; it does not replace Workspace membership. Assets
remain Workspace-owned and may be referenced by multiple Projects through an
explicit association. Asset versions are immutable, and a head change is an
atomic compare-and-set. A Blob is content storage behind a port, not a domain
entity that carries project workflow state.

The proposed capability inventory below is not a list of implemented RPCs.
Extend existing `workspace.assets.*` and Agent procedures where they already
serve the capability; new names must not silently replace working contracts.
The live adapter exposes asynchronous operations and uses bounded queries:

```text
account.profile.get
studio.snapshot.get
projects.list / get / create / update / archive / restore
projects.tasks.list / create / update
library.search
assets.list / get / versions.list / commitVersion / download.get
assets.upload.create / upload.complete
reviews.list / create / update / resolve
activity.list
pi.sessions.create / get / cancel / retry
devices.list / revoke / syncStatus.get
```

`studio.snapshot.get` contains account data, project summaries, the first page
of review attention, recent activity, and active session summaries. It never
contains Blob bytes or unbounded versions. The serialized snapshot has a
256 KiB target budget; full collections use cursor pagination with a maximum
page size of 100. Project lists sort by `updatedAt DESC, id DESC`, Activity by
`occurredAt DESC, id DESC`, and immutable versions by `createdAt DESC, id DESC`.
Lists return `items` plus an opaque `nextCursor`.

The existing RPC transport limits request bodies to 1 MiB and requests to
15 seconds. Blob bytes use the storage upload/download port. Pi start returns
a durable run identifier within the request deadline; progress observation and
reconnection are separate from starting the run. The stream/polling mechanism
and execution host must be settled before live Pi is enabled.

Mutations return Promises, expose stable errors, and invalidate the affected
snapshot/list query after success. Preview mutations adopt the same Promise
shape; views await completion and retain editable input after a failure. Keep
`getSnapshot` synchronous for subscriptions, separate pending/error state from
data, and scope caches to account and authorized context. Signing out clears
account caches, and late responses from a previous account are discarded.

Preserve existing `UNAUTHORIZED` and `FORBIDDEN` errors and the existing asset
and Agent domain codes. Phase 1 adds typed codes for validation, missing Blob,
upload limits, media types, timeout, and temporary unavailability, with retry
guidance and localized presentation. Asset commits and Pi start commands use
idempotency keys. Replaying a successful command returns its original result;
reusing its key with different input fails. Permission loss and stale version
conflicts must not trigger an automatic write retry.

The Blob port must provide upload creation, upload completion with checksum and
size validation, download access, and orphan cleanup. File-size limits, supported
types, thumbnail generation, and orphan/version retention must be specified
with the selected provider before upload is enabled. The Review model must
define at least `draft`, `open`, `changes_requested`, `approved`, and `closed`
states, with actor, project, target version, feedback, and transition time.
Feedback references a review and immutable target version, and records author,
body, timestamps, and open/resolved state. New versions do not silently move
existing feedback. Proposed review transitions are draft to open, open to
changes_requested or approved, changes_requested back to open, and an explicit
close action. The permission matrix must distinguish commenting from approving;
effective Project access includes Workspace membership and any project grants.
The API remains the final permission boundary.

The Project Studio UI uses no `pi` item in primary Project navigation. The
existing `/projects/$projectId/pi/$sessionId` route remains a standalone session
detail deep link for the first live release. The current preview `pi` tab is a
temporary history entry and is removed from navigation in Phase 3; old
`?tab=pi` links resolve to the replacement session history entry. A later
contextual viewer may replace standalone detail after a redirect destination is
specified and tested. Migration tests prove resolution works; only an observed
usage window can support a claim of no remaining use. Without usage evidence,
retain the redirect rather than breaking saved links.

## Preview migration runbook

The proposed preview v2 envelope is `{ version: 2, migratedFrom: 1, data }` at
`voidmix.project-studio.preview.v2`. The v1 value remains untouched until v2
validates and writes successfully. A successful write is the migration marker;
reloading v1 after that point is ignored. Repeating migration is therefore a
no-op.

Fresh previews use `migratedFrom: null`. A valid existing v2 takes precedence.
Invalid or future-version v2 values are preserved without being overwritten;
recovery uses in-memory preview until an explicit reset. All migration runs in
tab-local `sessionStorage`, and none of this preview data becomes account data
as a side effect of signing in.

The proposed preview field map retains `legacyStatus` for provenance. It is not
a production database backfill policy:

| v1 value                                   | v2 value                                                           |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `project.name`                             | `project.title`                                                    |
| `active`                                   | `stage: in_progress`, `archived: false`                            |
| `paused`                                   | `stage: in_progress`, `archived: false`, preserve pause provenance |
| `completed`                                | `stage: delivered`, `archived: false`                              |
| `archived`                                 | `stage: draft`, `archived: true`, `stageWasDefaulted: true`        |
| missing cover/thumbnail/deadline           | `null`                                                             |
| missing assets/reviews/project members     | empty collections                                                  |
| existing project/task/activity/session IDs | unchanged, preserving references                                   |

Dates are serialized as ISO strings at the browser-storage boundary and revived
to native `Date` values after schema validation. Unknown schema versions,
malformed JSON, invalid dates, and partial writes preserve the old key and
start a fresh labelled preview with localized copy explaining that saved
preview data could not be restored. Fixtures must cover a valid v1 payload,
each status mapping, missing optional fields, malformed data, unknown versions,
repeated migration, and running sessions that become stopped after reload.
Use the new schema's `cancelled` state for those interrupted preview sessions;
never resume them automatically. Storage quota/write failures leave v1 intact
and show a persistence warning. Archive timestamps missing in v1 remain unknown;
the migration must not invent a historical archive time. Keep the old key for at
least the compatibility release and remove it only through an explicit cleanup
step after successful migration.

## Phase exit gates

| Phase | Required result                                                                           | Owning workspaces                | Exit checks                                                                                        |
| ----- | ----------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------- |
| 0     | Functional Library, localized shell, account control, and Studio preview naming           | Web, Desktop                     | focused Web tests, Desktop check, `bun run policy`, `bun run format`                               |
| 1     | Canonical model, contracts, repositories, v2 migration, and remote adapter skeleton       | Core, Contracts, DB, Client, Web | owning `check`/`test` commands, `bun run generate`, migration fixtures                             |
| 2     | Shared shell, navigation, command menu, and reusable primitives                           | Web, Desktop, UI                 | UI component tests, Web/Desktop builds, keyboard and responsive checks                             |
| 3     | Home, Projects, all Project sections, Library, Activity, Settings, and online sync status | Web, Desktop                     | feature tests, live API integration tests, 390/768/1280 layout checks                              |
| 4     | Authenticated live routes, Pi/asset/review behavior, compatibility retirement             | API Runtime, Web, Desktop, E2E   | authorization/concurrency tests, old URL/key migration tests, `bun run verify`, `bun run test:e2e` |

Each phase is releasable only when its migration, documentation, and rollback
condition are recorded. Live routes remain behind a release switch until the
remote adapter passes its authorization and failure tests. Rollback restores
the previous route switch and preserves preview v1 and legacy Pi URLs for the
compatibility period; it does not delete user data.
The switch controls capability exposure, never API authorization. Rolling back
live routes must keep authentication and show an unavailable state if needed;
it must not fall back to a public preview using cached account data. Schema
changes remain additive through the compatibility period, and old-client/new-API
compatibility must pass before a rollback is considered available.

## Implementation sequence

### 0. Repair the baseline slice

The `7109fed3` commit introduced a Library route and changed several labels, but
it is not a completed Project Studio implementation. Before adding more surface
area:

- Move the Library page implementation out of the route module into a feature;
  keep the route as a thin declaration.
- Make Library search filter real asset/brief data and add an explicit empty
  state. Remove the generated visual-reference placeholder.
- Localize visible labels and navigation accessible names; remove locale-fragile
  string replacement in Desktop.
- Read the signed-in account for the account control instead of hard-coding a
  person's name.
- Rename shell, store, style, data-source, and translation identifiers when their
  meaning is product-facing. Internal Workspace tenancy names may remain.

### 1. Establish the product model

- Add account/project/asset/version/review/activity/Pi-session contracts and
  core boundaries. Keep optional `ProjectMember` support without requiring a
  member-management UI.
- Add the versioned preview migration and a remote adapter with the same
  interface.
- Separate project stage from archive state and provide mappings from the
  current `active`, `paused`, `completed`, and `archived` values.
- Update `CONTEXT.md` and the owning workspace documentation only when these
  model changes become running truth.

### 2. Build the shared shell and components

- Replace Workspace navigation with the five target destinations on Web and
  Desktop. Move Devices under Settings.
- Introduce Project Studio tokens and the shared components needed by both apps.
- Keep route modules thin, application composition local, and existing Base UI
  accessibility behavior intact.
- Add Command Menu navigation and global `CommandComposer`; keep initial-route
  menu code lazy where current bundle rules require it.

### 3. Rebuild the product surfaces

- Home: presentation-led hero composer, three metrics, Continue creating,
  review queue, recent assets, and activity.
- Projects: stage filters, creation, archive view, covers, deadlines, and useful
  empty states.
- Project: implement all seven sections and contextual Pi actions.
- Library: assets, references, briefs, versions, search, preview, and project
  association.
- Activity and Settings: account-wide history plus account, AI, notification,
  sync, and device controls.
- Desktop: use the same semantics with denser panels and native sync/runtime
  status. Do not copy Web page composition wholesale.

### 4. Connect live behavior and retire compatibility

- Put live Project Studio routes behind the authenticated application layout and
  send successful login directly to Home.
- Connect Pi commands, asset/version operations, feedback, reviews, and activity
  to authorized API procedures.
- Keep legacy Pi URLs and preview storage migration for one release cycle, then
  remove them only after telemetry or explicit migration tests show no remaining
  use.
- Replace all user-visible Workspace copy in Web/Desktop, manifests, metadata,
  recovery text, tests, and documentation. Retain the internal tenancy term only
  where it remains architecturally accurate.

## Current implementation audit

### Committed baseline

At `7109fed3`, the following Project Studio migration changes are implemented:

- Web navigation contains Home, Library, and Projects.
- `/library` exists and renders project-derived placeholder cards.
- Web header displays `Voidmix` instead of the selected Workspace.
- Desktop displays personal-studio sample copy and project-search copy.

Existing foundations also include Workspace membership authorization, asset
version/conflict services and persistence, and durable Agent run/step/lease
services. Extend these seams rather than recreating them. The Project port has
no production project/task persistence yet, and asset metadata does not provide
Blob storage. See [shared packages](./packages.md) for the implemented boundaries.

The Studio model integration, remote adapter, Home redesign, additional project
sections, functional asset Library, global Pi flow, authenticated product
routing, complete navigation, and Desktop migration remain open at this
baseline. The original handoff reported Web/Desktop builds and `verify` passing;
this documentation review did not rerun that committed tree. A passing
`bun run verify` proves repository consistency, not completion of this plan.

### Working tree observed September 8, 2026

The current working tree contains uncommitted Phase 0 work beyond that baseline,
including the Library feature extraction, Studio preview naming, account profile
read, and related Web/Desktop copy and shell changes. Those changes are not
part of the committed baseline; phase completion requires the corresponding
commit and verification evidence. Refresh this observation when that work lands.

## Acceptance and verification

A phase is complete only when its behavior, tests, documentation, and migrations
land together. The overall migration is complete when:

- sign-in reaches Home without a Workspace decision;
- a new user can create a project and begin a brief within 30 seconds;
- Home resumes recent work and launches Pi;
- Project exposes all seven target sections and consistent stage semantics;
- Library search returns real briefs/assets/versions and preserves migrated
  preview data;
- Web and Desktop share navigation terms, project stages, and interaction
  semantics;
- no user-facing Workspace selection or copy remains;
- keyboard-only use, visible focus, reduced motion, both themes, and 390px,
  768px, and 1280px layouts are verified;
- narrow workspace tests pass, then `bun run verify` passes;
- `bun run test:e2e` covers sign-in redirect, project creation, brief start,
  Library search, Pi cancellation, and old-preview migration.

Use the verification commands in each owning `AGENTS.md`. Build Web or Desktop
after route changes so the TanStack Start plugin regenerates route trees. Do not
hand-edit generated route trees.

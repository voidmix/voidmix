# Project Studio migration

> Status: approved migration plan, partially implemented. Baseline reviewed at
> `662c411` on September 8, 2026.

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
through the global composer and contextual actions instead of occupying a
standalone project tab. Existing Pi session URLs remain valid during migration.

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
and migrate `voidmix.workspace.preview.v1` once into the new key. Preserve
projects, tasks, activity, and sessions; derive missing stage, cover, deadline,
asset, and review fields from documented defaults. A failed migration keeps the
old value intact and starts a labelled fresh preview rather than partially
restoring data.

Until live APIs exist, adapters must remain honest about preview state. A network
failure must not silently replace account data with successful sample data.

## Implementation sequence

### 0. Repair the baseline slice

The `662c411` commit introduced a Library route and changed several labels, but
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

At baseline `662c411`, only the following is implemented:

- Web navigation contains Home, Library, and Projects.
- `/library` exists and renders project-derived placeholder cards.
- Web header displays `Voidmix` instead of the selected Workspace.
- Desktop displays personal-studio sample copy and project-search copy.
- Web and Desktop builds and the repository verification gate passed for that
  commit.

Everything else in this document remains open. In particular, the model,
adapters, shared components, Home Bento redesign, project sections, functional
Library, global Pi flow, authenticated routing, complete navigation, and Desktop
surface migration have not been implemented. A passing `bun run verify` proves
repository consistency; it does not prove this product plan is complete.

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

# Clean Signal Workspace

## Routes and ownership

Home (`/`) reads one aggregate Home View Model from the workspace data source.
`/projects` supports search and creation. `/projects/$projectId` owns overview,
tasks, Pi history, activity, and settings; `tab` and `filter` are validated URL
search parameters. `/projects/$projectId/pi/$sessionId` is a standalone,
project-bound conversation. Invalid project/session URLs show recovery links.

Web owns `ProjectCard`, `TaskList`, `ActivityList`, and `RunTimeline`. Shared UI
owns only `PageHeader`, `EmptyState`, `StatusBadge`, and `CommandInput`, each
with an explicit package subpath. The existing chat route and its local-chat
compatibility components remain unchanged; the root route uses `CleanHome`.

## Data and honesty

The project and Pi contracts/handlers are not yet implemented in the server.
These routes therefore use `WorkspaceDataSource` with a preview implementation,
not an API probe that silently substitutes successful fake data. All screens
identify preview mode. No provider key, model request, external mutation or
server-side authorization is implied by a successful preview interaction.

The adapter keeps projects, tasks, activities and conversations together in
`sessionStorage` under `voidmix.workspace.preview.v1`. A versioned schema
validates restored data and revives dates at this browser-storage boundary.
Malformed data returns to the seed; storage unavailability leaves in-memory
editing usable. Normal updates persist across a refresh in the same tab.
Previously running sessions become stopped on reload, never silently resumed.
Closing the tab discards the preview. State is not shared with user accounts.

Views use a stable snapshot subscription and named operations from the facade;
the home asks for an aggregate, rather than issuing per-widget requests.
Hydration has loading, failure and retry UI. Source injection permits tests
without network access. A future live adapter must map authorized oRPC DTOs
from `@voidmix/client` into these same view models and surface real failures;
it must not import the server-side `@voidmix/ai` package into Web.

## Interaction contract

- Home opens a project-bound conversation without performing a mutation in
  that project. Three templates populate the command input.
- Pi explains its preview capabilities, confirms creation of one local task,
  shows three ordered steps, and supports cancellation and retry. Navigating
  away aborts the local run. Results link to the project task list and support
  undo. This is not natural-language inference or live SDK streaming.
- Tasks support title/owner/priority/status editing and undo of the last write.
  Project settings support editing, archive confirmation, restore and undo.
- Search groups projects, tasks, conversations and pages; Ctrl/Cmd+K opens it.
  Modal controls use Base UI for focus management and Escape dismissal.
- Permission settings explicitly explain that member management is unavailable
  until the authenticated project API exists.

## Verification

```bash
bun run --cwd apps/web test -- src/features/projects src/features/pi
bun run --cwd packages/ui test:component
bun run verify
```

Use the Start Vite plugin through dev/build to regenerate routes; never edit
`routeTree.gen.ts`. Browser checks cover 1280px, 768px, and 390px layouts, Pi
cancel/retry, same-tab reload, task undo and settings persistence. Real-data
and live Pi integration checks require the remaining backend work; they are
not represented by preview tests.

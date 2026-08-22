# File Structure

Where a new file goes, and why. The listings in [`AGENTS.md`](../../AGENTS.md)
and [`README.md`](../../README.md) say which workspaces exist; this says how to
organise inside one.

`bun run policy` enforces the mechanical parts: every workspace has an
`AGENTS.md`, both workspace listings match reality, and no directory under
`apps/` or `packages/` is empty or lacks a `package.json`.

## The rule that decides everything

**Structure follows the size and number of ownership boundaries, not a template.**
`packages/auth` is 36 lines and one `src/index.ts`. `packages/scripts` is 2,200
lines and splits into `runtime/`, `database/`, `doctor/`, `policy/`, `commands/`.
Both are correct. Add structure when a directory has enough content to need it,
not in anticipation.

Corollary: **there are no empty directories.** Git cannot track one, so an empty
directory exists only in the working tree that created it, where it misleads
anyone reading the filesystem into thinking code belongs there. Policy fails on
them.

## Packages

```text
packages/<name>/
  src/index.ts        the entire package when it is small
  src/<domain>/       once the package is large enough to have domains
  AGENTS.md           purpose, interface, ownership, constraints, verification
  package.json        the exports map is the public interface — keep it narrow
```

Do not add a `src/types.ts`, `src/utils.ts`, or `src/constants.ts` by reflex. A
type belongs beside the thing it describes until a second consumer exists.

## Applications

```text
apps/<name>/
  src/routes/         route modules only: metadata, validation, loaders, mounting
  src/features/<f>/   the implementation a route mounts
  src/env.ts          this app's environment composition
  src/router.tsx      router construction and type registration
  public/             served verbatim at the site root — favicon, robots.txt
  AGENTS.md
```

**A route file is not a component library.** It declares the route and mounts a
feature. Components, hooks, and the browser-side API facade live under
`src/features/<feature>/`:

```text
src/features/users/
  client.ts             API facade, DTO to view-model mapping, fallback data
  use-admin-users.ts    hooks, named use-<thing>.ts, taking the client as an argument
  UserTable.tsx         feature-local components, flat while there are few
  components/           only once the feature has more than about three components
```

Promote a component to `packages/ui` when a second application needs it — not
before. A component used by two features in the same app moves up to that app,
not to the shared package.

Route modules should not own page fixtures, transport clients, fallback policy,
or large presentation trees. Keep those behind feature-local interfaces so a
route change only changes composition. When a feature has more than one data
source, keep the source adapters beside the feature and expose one small facade
to the page.

## Tests

Tests are co-located with the code and the layer is encoded in the filename:
`*.test.ts` unit, `*.integration.test.ts` integration, `*.component.test.tsx`
component. There is no parallel `tests/` tree; each workspace's
`vitest.config.ts` depends on this convention. See
[testing](./testing.md) for the layer table and the Vite+/Vitest boundary.

TanStack file-based route directories use the framework's ignored-file prefix
for route-adjacent tests (for example, `src/routes/-__root.test.ts`). Vitest
still collects these files, while the route generator leaves them out of the
generated route tree.

Write fixtures as override factories rather than literals, so a test states only
what it cares about:

```ts
function user(overrides: Partial<User> = {}): User {
  return { id: "user-1", email: "user@example.com", ...overrides };
}
```

Keep the factory local to the test file. **Extract a shared `packages/test-utils`
only when the same fixture is duplicated in three or more workspaces** — a new
workspace costs a manifest, an `AGENTS.md`, a tsconfig, and a vitest config, which
is not worth paying to deduplicate a few lines.

## Generated output

Never hand-edit it, and keep the formatter away from it — reformatting output that
a generator owns is reverted on the next run, which is permanent churn and defeats
drift detection. Oxfmt reads both `.gitignore` and `.prettierignore`, so an
excluded path may be listed in either:

| Path                   | Produced by                                          | Excluded via           |
| ---------------------- | ---------------------------------------------------- | ---------------------- |
| `src/routeTree.gen.ts` | the TanStack Start Vite plugin, via `dev` or `build` | `.prettierignore`      |
| `packages/db/drizzle/` | `bun run generate`                                   | `.prettierignore`      |
| `.agents/`             | `bun run skills:update`                              | `.prettierignore`      |
| `src-tauri/gen/`       | Tauri                                                | `src-tauri/.gitignore` |

## Repository root

Keep it small. A new root-level directory needs a reason no workspace can serve:

- Procedural automation goes in `packages/scripts` as a typed CLI command, **not**
  a root `scripts/` directory of loose shell files.
- A new surface goes in `apps/` as a workspace member, **not** a nested project
  with its own lockfile.
- Static assets belong to the application that serves them, in its `public/`.

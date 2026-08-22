# @voidmix/admin

## Purpose

The TanStack Start administration console. An app composition root, never
imported by a package. It is currently the only frontend wired to the API.

## Interface

```text
src/
  env.ts                    VITE_API_URL plus the hardcoded development actor
  router.tsx                getRouter(), preload defaults, Register
  routeTree.gen.ts          generated — do not edit
  routes/
    __root.tsx              createRootRoute with head() and shellComponent
    index.tsx               route declaration and feature mounts
  features/admin-shell.tsx  admin-specific shell and navigation
  features/users/
    page.tsx                user directory feature composition
    metric-grid.tsx         user metrics
    directory-toolbar.tsx   search and status filters
    directory.tsx           directory layout
    user-table.tsx          table rendering and states
    user-row.tsx            row presentation and actions
    client.ts               facade composing API and preview adapters
    api-adapter.ts          API client and DTO mapping
    preview-adapter.ts      deterministic seed adapter
    fallback-adapter.ts     API failure selection and logging
    types.ts                feature interfaces and view-model types
    use-admin-users.ts      useAdminUsers(client) hook
  styles.css                hand-written application CSS
```

## Ownership

- Own admin routes, tables, filters, and layouts. They stay here until another
  real consumer justifies extraction.
- Own the browser-side API facade and view-model mapping for admin features.
- Own no authorization decision — see Constraints.

## Constraints

- Route modules stay thin and only mount feature pages. Feature components receive
  explicit state and callbacks through props.
- The users facade keeps `AdminUsersClient` stable while API transport, preview
  seed data, and fallback logging remain separate adapters. The hook takes the
  client as a parameter so it stays injectable.
- **This app does not enforce authorization and must not pretend to.** It sends a
  hardcoded actor from `VITE_ACTOR_ID`/`VITE_ACTOR_ROLE` as request headers, and
  `apps/api` performs the final check. Any client-side guard is cosmetic; never
  treat it as enforcement.
- Admin writes must preserve authorization, audit, self-suspension, and
  final-administrator protections. Those live in `@voidmix/domain` — do not
  reimplement or bypass them from a feature module.
- API failures fall back to a seed fixture and log
  `log.warn({ event: "...fallback", reason: "api_unavailable" })`. Keep that
  shape so the fallback is observable rather than silent.
- File-based routing; the route tree regenerates on the next `dev` or `build`
  and you must **never hand-edit `routeTree.gen.ts`**. The root route uses `shellComponent`.
- `noUnusedLocals` and `noUnusedParameters` are enabled here and in `apps/web`
  only, so an unused import fails `check` in this app and nowhere else.
- There is no loader, `beforeLoad`, or server-function precedent here either;
  data fetching is a `useEffect` hook today. Introducing a route loader is a new
  convention, not an existing one.
- Dev server is `strictPort` on 3001.

## Verification

```bash
bun run --cwd apps/admin build   # regenerates routeTree.gen.ts via the Start plugin
bun run --cwd apps/admin check
bun run --cwd apps/admin test
bun run test:e2e                           # Playwright admin smoke project
```

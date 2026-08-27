# @voidmix/web

## Purpose

The TanStack Start user-facing application. An app composition root, never
imported by a package.

## Interface

```text
src/
  env.ts             browser-safe Web configuration and logger values
  router.tsx         getRouter(), scroll restoration, preload defaults, Register
  routeTree.gen.ts   generated — do not edit
  routes/
    __root.tsx       createRootRoute with head() and shellComponent
    manifest[.]webmanifest.ts  server route for the Web App Manifest
    index.tsx        route declaration and home feature composition
    (auth)/route.tsx public authentication group layout
    (auth)/          login, registration, reset, and verification routes
    (app)/route.tsx  authenticated group layout and session gate
    (app)/(admin)/route.tsx  AdminShell layout within the authenticated group
    (app)/(admin)/admin.tsx  protected Admin user-directory mount at /admin
    (app)/(admin)/admin/settings.tsx  mail settings mount at /admin/settings
    (app)/(admin)/admin/settings/auth.tsx  auth policy at /admin/settings/auth
  features/home/     home view data, components/, and feature CSS
  features/chat/     chat entry, fixtures, types, components/, and CSS
  features/auth/     Better Auth forms
  features/admin/    Admin shell, users adapters, views, tests, and scoped CSS
  i18n/              static catalogs, API error codes, recovery copy
server/
  env.ts             server-only API/Auth/Mail environment composition
  app.ts             Nitro Web-format handler
  runtime.ts         memoized shared API runtime
  runtime.plugin.ts  Nitro startup and shutdown lifecycle
  styles.css         global reset, token entry, and feature stylesheet imports
tsr.config.json      TanStack Router CLI config (all defaults, target react)
```

## Ownership

- Own public pages, authentication UI, protected Admin routes, React
  composition, SSR shell, and application-specific visual composition.
- Own no shared primitive — those belong in `@voidmix/ui`.

## Constraints

- File-based routing. Add `src/routes/<path>.tsx` exporting
  `export const Route = createFileRoute("/path")({ component: X })`. Server-only
  endpoints may use `server.handlers` and omit `component`. The route tree
  regenerates on the next `dev` or `build`.
- Route modules stay thin: route declaration, route-level layout, and composition
  of a small number of feature entrypoints. Feature components, state, static
  view data, and business behavior belong under `src/features/<feature>/`.
- Keep feature view data, fixtures, types, tests, and styles at the feature root.
  Once a feature has more than about three internal presentation components,
  place those components in a feature-local `components/` directory.
- TanStack route groups use parenthesized directories such as `(auth)` and
  `(app)`. A group's `route.tsx` is its layout and the group name does not appear
  in the URL.
- **`routeTree.gen.ts` is generated; never hand-edit it.** `.prettierignore`
  keeps the formatter away from it for the same reason.
- The root route uses **`shellComponent`**, not `component`. `RootDocument`
  renders the whole `<html>` document including `<HeadContent />` and
  `<Scripts />`; do not move either into a separate wrapper.
- The root loader owns locale **and** theme resolution
  (`src/lib/request-preferences.ts`) — both providers need the value before the
  first render or they paint a wrong one and correct it in an effect. Root
  composition supplies the statically imported `src/i18n/messages.ts` catalog
  to `@voidmix/i18n`; feature modules select namespaces with the facade hook.
- `noUnusedLocals` and `noUnusedParameters` are enabled here, so an unused
  import fails `check`.
- Better Auth and `@voidmix/client` use same-origin `/api/auth/*` and `/rpc/*`
  requests with credentials. Desktop remains the absolute-origin API consumer.
- Nitro mounts `@voidmix/api-runtime` only at `/api/auth/**`, `/rpc/**`, and
  `/health`; never add a catch-all Hono handler that can swallow TanStack routes.
- `server/runtime.ts` owns one memoized runtime per process. The lifecycle plugin
  initializes it at startup and closes it through Nitro's `close` hook.
- `server/env.ts` is never imported by browser modules. Keep database, Auth, mail,
  and allowed-origin values on the server side of the Web bundle.
- `(app)/route.tsx` is the established client-side session gate. It is
  navigation aid, not authorization enforcement. There is still no loader,
  `beforeLoad`, or server function precedent in this app.
- `(app)/(admin)/route.tsx` owns the AdminShell layout. Keep the authenticated
  group focused on session navigation and keep `/admin` page mounting and typed
  settings adapters in the nested Admin group. Settings API failures are shown
  directly; do not add a preview/fallback adapter for system configuration.
- Authentication settings are read-only for `admin` and writable only for
  `owner` in the UI. That role check controls presentation only; the API
  permission remains the authoritative boundary.
- Admin settings forms display effective values, sources, and safe inherited
  previews. Untouched fields are omitted, clearing ordinary mail text schedules
  `reset`, and secret inputs stay blank: blank retains while the explicit remove
  action resets the database override.
- Public Auth pages consume only `public.auth.capabilities.get`. Registration and
  tokenless reset entry points follow those booleans, an existing reset token
  remains usable, and capability-request failures fail open so the server remains
  the final policy boundary.
- Stylesheets: `src/styles.css` imports `@voidmix/ui/styles.css`, then the root
  route imports that single entry with `?url` and feeds it through `head().links`.
- Dev server is `strictPort` on 3000. Vite plugin order is
  evlog → nitro → tailwindcss → tanstackStart → viteReact. The React plugin uses
  the Oxc-backed React Compiler. Nitro uses explicit Web-format routes with
  directory scanning and its automatic server entry off.
- Keep menu-heavy secondary interactions out of the home route's initial client
  path. Language, theme, and Composer attachment menus preload on focus or
  pointer interaction and load their Base UI menu implementation on demand.
- Import extensions are inconsistent per file (`../env.js` vs `./routeTree.gen`).
  Mirror the neighbouring import rather than reasoning about it.
- Keep `vite.config.ts` and `vitest.config.ts` separate. Loading the application
  plugin pipeline in the test runner breaks React 19's CJS entry — see
  [testing](../../docs/development/testing.md).
- Web catalogs are statically imported so translation hooks never suspend during
  SSR or hydration. Root recovery pages use static
  `src/i18n/recovery-messages.ts` copy to survive a broken application chunk,
  drift-guarded by its test.

## Verification

```bash
bun run --cwd apps/web build   # regenerates routeTree.gen.ts via the Start plugin
bun run --cwd apps/web check
bun run --cwd apps/web test
bun run test:e2e                         # Playwright smoke, needs browsers
```

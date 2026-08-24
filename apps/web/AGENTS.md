# @voidmix/web

## Purpose

The TanStack Start user-facing application. An app composition root, never
imported by a package.

## Interface

```text
src/
  env.ts             public Web configuration and server runtime env
  router.tsx         getRouter(), scroll restoration, preload defaults, Register
  routeTree.gen.ts   generated — do not edit
  routes/
    __root.tsx       createRootRoute with head() and shellComponent
    index.tsx        route declaration and home feature composition
    (auth)/route.tsx public authentication group layout
    (auth)/          login, registration, reset, and verification routes
    (app)/route.tsx  authenticated group layout and session gate
    (app)/(admin)/route.tsx  AdminShell layout within the authenticated group
    (app)/(admin)/admin.tsx  protected Admin user-directory mount at /admin
  features/home/     home view data, components/, and feature CSS
  features/chat/     chat entry, fixtures, types, components/, and CSS
  features/auth/     Better Auth forms
  features/admin/    Admin shell, users adapters, views, tests, and scoped CSS
  server/api/        Nitro handler, runtime singleton, and lifecycle host wiring
  styles.css         global reset, token entry, and feature stylesheet imports
tsr.config.json      TanStack Router CLI config (all defaults, target react)
```

## Ownership

- Own public pages, authentication UI, protected Admin routes, React
  composition, SSR shell, and application-specific visual composition.
- Own no shared primitive — those belong in `@voidmix/ui`.

## Constraints

- File-based routing. Add `src/routes/<path>.tsx` exporting
  `export const Route = createFileRoute("/path")({ component: X })`. The route
  tree regenerates on the next `dev` or `build`.
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
- `noUnusedLocals` and `noUnusedParameters` are enabled here, so an unused
  import fails `check`.
- Better Auth and `@voidmix/client` use same-origin `/api/auth/*` and `/rpc/*`
  requests with credentials. Desktop remains the absolute-origin API consumer.
- Nitro mounts `@voidmix/api-runtime` only at `/api/auth/**`, `/rpc/**`, and
  `/health`; never add a catch-all Hono handler that can swallow TanStack routes.
- `src/server/api/runtime.ts` owns one memoized runtime per process. The lifecycle
  plugin initializes it at startup and closes it through Nitro's `close` hook.
- `(app)/route.tsx` is the established client-side session gate. It is
  navigation aid, not authorization enforcement. There is still no loader,
  `beforeLoad`, or server function precedent in this app.
- `(app)/(admin)/route.tsx` owns the AdminShell layout. Keep the authenticated
  group focused on session navigation and keep `/admin` page mounting in the
  nested Admin group.
- Stylesheets: `import "@voidmix/ui/styles.css"` plus
  `import appCss from "../styles.css?url"` fed through `head().links`.
- Dev server is `strictPort` on 3000. Vite plugin order is
  evlog → nitro → tailwindcss → tanstackStart → viteReact. Nitro uses explicit
  Web-format routes with directory scanning and its automatic server entry off.
- Import extensions are inconsistent per file (`../env.js` vs `./routeTree.gen`).
  Mirror the neighbouring import rather than reasoning about it.
- Keep `vite.config.ts` and `vitest.config.ts` separate. Loading the application
  plugin pipeline in the test runner breaks React 19's CJS entry — see
  [testing](../../docs/development/testing.md).

## Verification

```bash
bun run --cwd apps/web build   # regenerates routeTree.gen.ts via the Start plugin
bun run --cwd apps/web check
bun run --cwd apps/web test
bun run test:e2e                         # Playwright smoke, needs browsers
```

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
    index.tsx        route declaration and HomePage mount
  features/home/     home page composition, view data, and feature components
  styles.css         hand-written application CSS
tsr.config.json      TanStack Router CLI config (all defaults, target react)
```

## Ownership

- Own page routing, React composition, SSR shell, and application-specific
  visual composition.
- Own no shared primitive — those belong in `@voidmix/ui`.

## Constraints

- File-based routing. Add `src/routes/<path>.tsx` exporting
  `export const Route = createFileRoute("/path")({ component: X })`. The route
  tree regenerates on the next `dev` or `build`.
- Route modules stay thin: route declaration and feature mounting only. Page
  components, static view data, and page-specific composition belong under
  `src/features/<feature>/`.
- **`routeTree.gen.ts` is generated; never hand-edit it.** `.prettierignore`
  keeps the formatter away from it for the same reason.
- The root route uses **`shellComponent`**, not `component`. `RootDocument`
  renders the whole `<html>` document including `<HeadContent />` and
  `<Scripts />`; do not move either into a separate wrapper.
- `noUnusedLocals` and `noUnusedParameters` are enabled here and in `apps/admin`
  only, so an unused import fails `check` in this app and nowhere else.
- **This app is not wired to the API yet.** There is no `@voidmix/client`
  dependency and no `VITE_API_URL` in `src/env.ts`. Calling the API requires
  adding both — copy `apps/admin/src/env.ts` and run `bun install`.
- **There is no loader, `beforeLoad`, server-function, nested-layout, or route-guard
  precedent anywhere in this app.** Introducing one is a new convention, not a
  pattern to follow. `apps/desktop` uses code-based routing and is not the model.
- Stylesheets: `import "@voidmix/ui/styles.css"` plus
  `import appCss from "../styles.css?url"` fed through `head().links`.
- Dev server is `strictPort` on 3000. Vite plugin order is
  evlog → tailwindcss → tanstackStart → nitro → viteReact.
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

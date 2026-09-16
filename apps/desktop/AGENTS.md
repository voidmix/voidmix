# @voidmix/desktop

## Purpose

The Tauri 2 cloud client: a TanStack Start SPA renderer in a Rust-hosted
window. An app composition root, never imported by a package.

## Interface

```text
src/
  router.tsx        getRouter() over the generated file-route tree
  routeTree.gen.ts  generated — do not edit
  routes/
    __root.tsx      static document shell, locale bootstrap, DesktopShell layout
    index.tsx       Home/overview route
    activity/route.tsx activity route
    devices/route.tsx devices route
    projects/
      route.tsx    project layout with Outlet
      index.tsx    projects list index route
      $projectId.tsx project detail route
    settings/route.tsx settings route
  styles.css        shared UI and Desktop stylesheet entry
  env.ts            desktop environment composition
  features/
    shell/           Tauri-aware desktop shell
    overview/        overview page composition
    projects/        project list and detail composition
    activity/        activity page composition
    devices/         devices page composition
    settings/        settings page composition
  lib/cloud.ts      stable cloud facade and formatting helper
  lib/cloud/        remote normalization, source selection, and types
  lib/desktop.ts    Tauri bridge helpers
  router.integration.test.tsx route rendering, loading, refresh, and history tests
  i18n/             static catalogs and API error codes
src-tauri/
  src/main.rs, src/lib.rs   Rust entry and app setup
  tauri.conf.json           window, bundle, and updater configuration
  capabilities/default.json permission allowlist
  Cargo.toml
```

## Ownership

- Own the desktop shell, the Tauri bridge, and desktop-specific routing.
- Own no shared primitive and no backend behaviour; it reaches the API through
  `@voidmix/client`.

## Constraints

- This app uses TanStack Start file routing in **SPA mode**. Route modules stay
  thin and lazy-load page entrypoints directly from `src/features/<feature>/`.
  There is no application-wide page barrel.
- Organize URL segments as directories. Use `route.tsx` for the segment route
  or layout, `index.tsx` for its exact page, and `$param.tsx` for dynamic children;
  do not encode nesting in dotted route filenames.
- Home, Devices, and Project routes load API data in client-only route loaders.
  Feature pages read typed loader data; refresh and successful mutations invalidate
  the owning route. Pass the route abort signal through API requests.
- Keep `/projects/` in `projects/index.tsx`; `projects/route.tsx` renders an
  `Outlet` for both the list and `/projects/$projectId`. Activity filters are
  validated URL search parameters.
- Shared pending and retry UI lives in `features/shell/route-state.tsx`.
- **`routeTree.gen.ts` is generated; never hand-edit it.** The Start Vite plugin
  refreshes it during `dev` or `build` and owns the Register footer.
- `routes/__root.tsx` owns the static HTML document, stylesheet link, locale
  bootstrap, and DesktopShell layout. The build-time shell starts in English;
  hydration reads localStorage and `navigator.language`, then applies the
  preference through the shared provider. Storage or document-sync failures do
  not make the renderer unusable.
- Desktop Start has no runtime server. RSC stays disabled, and Desktop route
  modules must not add server functions or server routes. Backend behavior
  remains behind `@voidmix/client` and the configured cloud origin.
- Start writes the Tauri assets to `dist/client/index.html`. Its `dist/server`
  output exists only to prerender that shell during the build and is not bundled
  into the installer; keep `src-tauri/tauri.conf.json` pointed at `../dist/client`.
- `check` runs **two** typecheck passes (`typecheck` and `typecheck:node`) because
  the renderer and the Node-side config have separate tsconfigs. Both must pass.
- After renaming routes, let the Start dev plugin regenerate the tree before
  running `build`, whose first step checks the existing generated route types.
- Rust changes additionally require `cargo fmt --check`, `cargo check`, and
  `cargo clippy --all-targets -- -D warnings` in `src-tauri`.
- `src-tauri/gen/schemas/` is generated Tauri output — do not hand-edit it.
- Widening `capabilities/default.json` grants the renderer new native access.
  Treat it as a security boundary and keep the allowlist minimal.
- Keep credentials and service secrets out of the desktop client. It is a cloud
  client, not a second server runtime.
- `VITE_API_URL` selects the cloud backend. Project pages call the canonical account/project API and show an unavailable state when the API is absent.
- `normalizeSnapshot` validates dates, counts, byte units, and job/device
  discriminants once at the remote boundary before data reaches a page.
- Primary navigation uses Home, Projects, Activity, and Settings. Devices remains reachable from Settings and is not a primary destination. Project loaders use `src/lib/projects.ts` for the shared canonical API client.
- Closing the main window hides it instead of exiting; the tray menu shows,
  hides, or quits. `src-tauri/src/lib.rs` owns that behaviour and reports it to
  the renderer as `trayEnabled`, which is false in a plain browser preview.
- This is the only workspace with a user-visible version. Record user-facing
  changes in [`CHANGELOG.md`](./CHANGELOG.md) and keep the version in
  `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` in step.
- Use `@voidmix/ui` primitives and Phosphor icons; the same no-Radix, no-Lucide
  rule applies here.

## Verification

```bash
bun run --cwd apps/desktop build          # refreshes routeTree.gen.ts and SPA shell
bun run --cwd apps/desktop check          # runs both typecheck passes
bun run --cwd apps/desktop test
bun run i18n:check
bun run desktop:build

cd apps/desktop/src-tauri                 # for any Rust change
cargo fmt --check
cargo check
cargo clippy --all-targets -- -D warnings
```

# @voidmix/desktop

## Purpose

The Tauri 2 cloud client: a TanStack Start SPA renderer in a Rust-hosted
window. An app composition root, never imported by a package.

## Interface

```text
src/
  App.tsx           compatibility exports for feature pages
  router.tsx        getRouter() over the generated file-route tree
  routeTree.gen.ts  generated — do not edit
  routes/
    __root.tsx      static document shell, locale bootstrap, DesktopShell layout
    index.tsx       overview route
    activity.tsx    activity route
    devices.tsx     devices route
    settings.tsx    settings route
  styles.css        shared UI and Desktop stylesheet entry
  env.ts            desktop environment composition
  features/
    shell/           Tauri-aware desktop shell
    overview/        overview page composition
    activity/        activity page composition
    devices/         devices page composition
    settings/        settings page composition
  lib/cloud.ts      stable cloud facade and formatting helper
  lib/cloud/        remote source, preview source, validation, and types
  lib/desktop.ts    Tauri bridge helpers
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
  thin and lazy-load page entrypoints from `src/features/<feature>/`; do not
  grow `App.tsx` into a page aggregator.
- **`routeTree.gen.ts` is generated; never hand-edit it.** The Start Vite plugin
  refreshes it during `dev` or `build` and owns the Register footer.
- `routes/__root.tsx` owns the static HTML document, stylesheet link, locale
  bootstrap, and DesktopShell layout. The build-time shell starts in English;
  hydration reads localStorage and `navigator.language` before normal use.
- Desktop Start has no runtime server. RSC stays disabled, and Desktop route
  modules must not add server functions or server routes. Backend behavior
  remains behind `@voidmix/client` and the configured cloud origin.
- Start writes the Tauri assets to `dist/client/index.html`. Its `dist/server`
  output exists only to prerender that shell during the build and is not bundled
  into the installer; keep `src-tauri/tauri.conf.json` pointed at `../dist/client`.
- `check` runs **two** typecheck passes (`typecheck` and `typecheck:node`) because
  the renderer and the Node-side config have separate tsconfigs. Both must pass.
- Rust changes additionally require `cargo fmt --check`, `cargo check`, and
  `cargo clippy --all-targets -- -D warnings` in `src-tauri`.
- `src-tauri/gen/schemas/` is generated Tauri output — do not hand-edit it.
- Widening `capabilities/default.json` grants the renderer new native access.
  Treat it as a security boundary and keep the allowlist minimal.
- Keep credentials and service secrets out of the desktop client. It is a cloud
  client, not a second server runtime.
- `VITE_API_URL` selects the cloud backend. Without it, or when the request
  fails, `src/lib/cloud.ts` renders a deterministic preview snapshot so renderer
  and Tauri work do not require a running API. Keep that fallback observable
  rather than silent.
- `lib/cloud/source.ts` selects between the remote and demo adapters; pages must
  consume `loadCloudSnapshot()` and never implement transport or fallback logic.
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
bun run desktop:build

cd apps/desktop/src-tauri                 # for any Rust change
cargo fmt --check
cargo check
cargo clippy --all-targets -- -D warnings
```

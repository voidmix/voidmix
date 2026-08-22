# @voidmix/desktop

## Purpose

The Tauri 2 cloud client: a React/Vite renderer in a Rust-hosted window. An app
composition root, never imported by a package.

## Interface

```text
src/
  main.tsx          renderer entry
  App.tsx           compatibility exports for feature pages
  router.tsx        code-based route tree built with createRoute/addChildren
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

- **This app uses code-based routing** (`createRoute` / `addChildren` in
  `src/router.tsx`), unlike `apps/web` and `apps/admin` which are file-based. Do
  not copy this pattern into those apps, and do not copy theirs into here.
- Route construction mounts feature pages directly. Keep page-specific UI under
  `src/features/<feature>/`; do not grow `App.tsx` into a page aggregator.
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
bun run --cwd apps/desktop check          # runs both typecheck passes
bun run --cwd apps/desktop test
bun run desktop:build

cd apps/desktop/src-tauri                 # for any Rust change
cargo fmt --check
cargo check
cargo clippy --all-targets -- -D warnings
```

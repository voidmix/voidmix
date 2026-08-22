# Changelog — Voidmix Desktop

This file exists for `apps/desktop` alone, because it is the only surface with a
version users see: a Tauri bundle they install and later upgrade. Web, Admin, and
API are continuously deployed from `canary` and have no release to describe, so
they have no changelog — git history already records their changes.

Entries describe what changed **for someone running the application**. Internal
refactors, dependency bumps, and tooling changes belong in the commit log unless a
user can observe them.

## Conventions

- Newest release first. Heading format `## <version> — <YYYY-MM-DD>`.
- Group entries under `Added`, `Changed`, `Fixed`, `Removed`, or `Security`; omit
  the groups that have nothing in them.
- Keep unreleased work under `## Unreleased` and rename that heading when a
  release is cut.
- The version must match `package.json`, `src-tauri/tauri.conf.json`, and
  `src-tauri/Cargo.toml`, which are currently kept in step by hand.

## Unreleased

Nothing user-facing yet. `0.1.0` has not been released; there are no tags and CI
has no release job, so the version in the three manifests is a placeholder rather
than a shipped build.

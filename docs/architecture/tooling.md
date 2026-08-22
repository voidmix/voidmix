# Toolchain

## Runtime responsibilities

```text
Bun       dependency installation, lockfile, tests, and repository scripts
Vite+     development commands, task ordering, caching, checks, builds,
          linting, and formatting
Nitro     API and TanStack Start server build/deployment shell
Node.js   initial Web, Admin, and API production runtime
Rust      Tauri native runtime
```

Do not add Turborepo alongside Vite+. Runtime services remain on Node.js until
real compatibility tests and benchmarks justify a change.

## Bun catalogs

The root `package.json` centralizes versions with Bun catalogs:

- Default: React, TanStack Router/Start, and oRPC.
- `catalog:tooling`: TypeScript, Type-fest, Vite+, Vite alias, React
  types/plugin, Citty, Dotenvx, and related tooling, Vitest, coverage, and
  Playwright.
- `catalog:backend`: Hono, Nitro, Drizzle, PostgreSQL, and Zod.
- `catalog:observability`: Evlog.
- `catalog:frontend`: Base UI, Phosphor Icons, Tailwind CSS, CVA, `clsx`, and
  `tailwind-merge`.
- `catalog:desktop`: Tauri packages.

Internal packages use `workspace:*`. Change third-party versions in the root
catalog rather than individual workspace manifests.

The root override pins `lightningcss` to a single compatible native binding
version. Treat changes to this override as toolchain upgrades: update the
catalog, regenerate `bun.lock`, and run the full verification suite.

## TypeScript presets

`@voidmix/tsconfig` exports:

```text
base.json           strict shared rules, including an empty ambient `types`
browser.json        Vite, TanStack Start, and WebView applications
node.json           API, DB, Scripts, and E2E; widens `types` to ["node"]
library.json        platform-neutral packages
react-library.json  shared React UI packages
```

Which workspace extends which preset is not listed here. That listing is derived
data — `grep extends */*/tsconfig.json` answers it, and the copy that lived here
was already stale — so read the workspace file instead.

A preset owns every option every consumer wants, including the ambient `types`
default and the unused-symbol checks. A workspace file therefore holds only
`include` plus the options that genuinely differ: `apps/web` and `apps/admin`
widen `types` because their `include` covers `vite.config.ts`, and
`packages/client` widens `lib` for DOM APIs. Restating an inherited value is a
`bun run policy` error, because the copy stops tracking the preset the moment the
preset changes.

Shared presets do not define `include`, `exclude`, `rootDir`, `outDir`, `paths`,
or workspace references. Full TypeScript Project References are deferred until
editor or full-repository type checking becomes measurably slow.

## Linting and formatting

Oxlint and Oxfmt ship inside Vite+ and are configured in the root
`vite.config.ts`, so the repository has no ESLint, Prettier, or standalone hook
manager to install:

```text
bun run lint         vp lint          Oxlint, type-aware, with the vite-plus plugin
bun run format       vp fmt --check   fail on unformatted files
bun run format:fix   vp fmt           rewrite files in place
```

`check` stays `vp run -r check` — per-workspace `tsc --noEmit`. It is
deliberately not repointed at `vp check`, which resolves a different graph
(root-level typecheck plus fmt and lint).

Oxfmt reads `.gitignore` and `.prettierignore`. The latter excludes generated
output — the TanStack route trees, Drizzle migrations, and vendored agent skills
— because formatting them would be reverted by whichever tool owns them,
producing permanent churn and defeating drift detection.

The `staged` block in `vite.config.ts` defines the pre-commit formatting and
lint-fix pass. It is opt-in per developer through `vp hooks enable`, which sets
the local `core.hooksPath`; no hook configuration is committed.

## Repository scripts

`@voidmix/scripts` exposes:

```text
env -- <command>       run a child command with root development env files
doctor                  check core and optional development prerequisites
clean                  remove rebuildable outputs and tool caches
db migrate             apply Drizzle migrations
db seed                seed development/test data
db studio              open Drizzle Studio in development/test
admin create           create an idempotent initial administrator
policy [--fix]         check repository conventions; --fix rewrites the
                       findings that have exactly one possible remedy
generate               regenerate Drizzle artifacts
desktop build          build the Tauri application
verify                  run every gate: policy, format, lint, check, test,
                        build, and the Nitro runtime probe
shadcn update          refresh tracked shadcn/ui components in packages/ui
```

Dependency maintenance uses the repository-local `taze` CLI and Bun's
workspace/catalog resolver:

```text
bun run deps:check      fail when compatible dependency updates are available
bun run deps:update     write compatible updates, then refresh bun.lock
```

The update command scans all workspaces and Bun catalogs in `minor` mode. It
includes exact pins, but deliberately excludes Bun/Node runtime versions and
the Vitest 4 packages that must stay aligned with the pinned Vite+ release.
Major upgrades and toolchain exceptions remain manual decisions.

Commands must support CI/non-interactive execution, explicit exit codes, and
structured logging. Destructive database operations are restricted to local
development and test environments.

`generate` covers Drizzle only. Route trees are owned by
`@tanstack/start-plugin-core`, whose Vite plugin appends the
`declare module '@tanstack/react-start'` Register footer to
`routeTree.gen.ts`. `@tanstack/router-cli` knows nothing about Start, so
invoking `tsr generate` standalone writes a tree without that footer: a
strictly worse file that still passes `tsc` and that the next `dev` or `build`
silently repairs into a spurious diff. Neither application defines a
`generate-routes` script for that reason. The two tools are versioned on
independent lines — `router-cli` 1.167.x against `react-router` 1.170.x and
`react-start` 1.168.x — so a version mismatch is not the cause and aligning
them is not the fix.

Use `vmx env -- <command>` only in workspace scripts that need root env
files. The runner uses the Dotenvx API directly rather than starting a second
CLI process. It loads `.env.local`, then `.env`, without overriding inherited
environment values. Tests are intentionally not wrapped. Do not add Vite
`envDir` settings or workspace-relative env paths; all repository-configured
env-file loading for development and build commands goes through this runner.

`@voidmix/scripts` commands declare a `process`, `repository`, or `database`
environment policy. A shared contextual action creates the matching copied
environment and logger before invoking the command operation. Database and
Admin commands load and validate repository env directly; generate, Desktop
build, and shadcn update load the raw repository env for child processes;
clean and verify do not read env files. This avoids recursively invoking `vmx env` around another
`vmx` process. External Vite, Drizzle, and Tauri workspace commands
continue to use the env runner.

Citty modules remain thin adapters. Database policies, PostgreSQL resource
construction, injectable operations, Doctor checks, Doctor runtime probes, and
Doctor report rendering are kept in separate modules. Tests target those seams
without connecting to PostgreSQL or starting optional tools.

`policy` follows the same shape and is what keeps repository conventions from
rotting: `src/policy/{agents,ignores,links,manifests,skills,tsconfig,workspaces}.ts`
are pure functions over text, `checks.ts` composes them, `runtime.ts` supplies the
filesystem adapters, and `report.ts` renders each finding with a copy-pasteable
`Fix:` line. It resolves workspaces from Bun's globs rather than a directory walk,
and reports any glob match lacking a `package.json` — a directory that nothing
builds or tests but that an agent reading the filesystem still treats as a place
code belongs. `vmx verify` runs it first, because a structural failure should
not wait for a build. Distinct from `doctor`, which asserts machine prerequisites
and therefore cannot run in CI.

`fixes.ts` applies the findings whose remedy is a transformation rather than a
decision: a canonical test script, a `build` that does not run `check`, a locally
restated `devEngines`, an unanchored ignore pattern, a duplicated one, and a
compiler option the preset already provides. Each fixer sits beside its validator
and shares the same private predicate, so the two cannot disagree about what
counts as a violation.

It deliberately stops short of the rest. Which catalog a dependency belongs in,
whether a stray test script or a missing runner is the mistake, and which preset a
config should extend are all judgements, and applying a guess would be worse than
leaving the finding. The command prints the report _after_ fixing, so what remains
on screen is what still needs a person — a fix that failed shows up rather than
being claimed. The rewritten files are handed to `vp fmt`, because a fixer that
rewrites JSON cannot also be the authority on how JSON is formatted.

Pass the flag without a `--` separator: `vp run @voidmix/scripts#policy --fix`
reaches the CLI, while `vp run @voidmix/scripts#policy -- --fix` does not.

Scripts filenames use domain directories as naming context (`database/policy.ts`,
`doctor/checks.ts`, and `runtime/process.ts`) instead of repeating prefixes in
the repository root. Relative ESM imports continue to use `.js` because the
workspace uses TypeScript `NodeNext` resolution.

`runtime/env.ts` exposes `resolveProcessEnvironment("process" | "repository")`.
The `process` source only copies inherited values; the `repository` source also
applies root `.env.local` and `.env` with a repository-scoped nested-runner
guard. The guard records the repository root in the child environment, so a
nested command in the same checkout skips duplicate loading while a command
that enters another checkout still resolves that repository's files. Schema
parsing remains in root `env.ts` and happens after the process environment has
been resolved.

`bun run clean` removes build outputs, coverage and browser-test reports,
TanStack/Vite+/Nitro/Vite caches, and the Tauri Cargo `target` directory. It
does not remove dependencies, generated route trees, or Drizzle migrations.
Every root script for this package calls the `vmx` bin directly — `bun run
db:migrate` is `vmx db migrate` — so the colon-separated names are aliases for
nested CLI commands, and `bun run vmx <command>` reaches anything without one.
[ADR-0002](decisions/0002-vite-plus-sole-orchestrator.md) records why they no
longer route through `vp run`.

Renaming this bin needs `bun.lock` changed with it. The lockfile records the bin
name as derived metadata and `bun install` links from the lockfile rather than the
manifest, while `--frozen-lockfile` still passes — so a rename appears to work
while `node_modules/.bin` keeps the old name. Edit that one line instead of
regenerating the lockfile: regenerating on macOS drops the 39 Linux-only optional
dependency entries and breaks the Linux CI job.

`bun run shadcn:update` re-runs `shadcn add --overwrite` for every component
listed in `packages/ui/shadcn-components.json`, refreshing them to the latest
upstream version. Add a component's name to that file's `components` array
when you pull it in with the shadcn CLI so future updates keep it in sync.
`--overwrite` regenerates the file from the vanilla upstream template, so it
discards any project-specific edits layered on top (custom variants, the
legacy `vm-*` class hooks in `packages/ui/src/styles.css`, added prop types).
Always review the diff after running it and manually re-apply project
customizations before committing; never run it unattended.

`bun run doctor` fails for incorrect Bun/Node versions, missing repository
metadata, required local binaries, or invalid environment schemas. Missing
Rust/Cargo or Docker tooling is reported as a warning because those workflows
are optional. `bun run db:studio` is interactive and bypasses Vite+ task
orchestration.

The Citty command tree provides `vmx --help`, nested command help such as
`vmx db --help`, and `vmx --version`.

Use root Bun scripts so the repository-local Vite+ version is selected instead
of a potentially different global `vp` binary.

## Browser verification

The private `@voidmix/e2e` workspace owns Playwright configuration and browser
smoke tests. Its projects target Web on port `3000` and Admin on port `3001`;
the Playwright `webServer` entries start those apps for local and CI runs.
Browser tests are not part of the default `bun run test` graph. Use
`bun run test:e2e`, and install Chromium with
`bun run --cwd e2e playwright install chromium`
when running locally. CI uses the same pinned catalog version and invokes the
workspace-local Playwright binary to install Linux browser dependencies before
the E2E job.

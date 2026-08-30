# Testing and Verification

## Standard verification

```bash
bun install --frozen-lockfile
bun run verify
```

`verify` is the gate, and the list below is what it contains, in order. Each
stage is cheaper than the one after it, so the first failure is usually the
fastest one to reproduce:

`bun run verify` captures child-process output by default, so successful checks
do not flood the terminal or an agent context. If a gate fails, `vmx` reports a
sanitized tail of that command's output. Use `bun run verify --verbose` when
interactive debugging needs the full live output.

| Stage   | Command           | Why it is at this position                     |
| ------- | ----------------- | ---------------------------------------------- |
| policy  | in-process        | milliseconds, and its failures are structural  |
| format  | `vp fmt --check`  | under a second over the whole repository       |
| lint    | `vp lint`         | seconds, type-aware                            |
| check   | `vp run -r check` | per-workspace `tsc --noEmit`                   |
| test    | `vp run -r test`  | every workspace's Vitest suite                 |
| build   | `vp run -r build` | with `NITRO_PRESET=bun` (see below)            |
| runtime | in-process        | starts each built server and requires HTTP 200 |

Nothing else needs to be run in sequence. The remaining scripts narrow a failure
down: `bun run policy` prints each finding with a `Fix:` line and
`bun run policy:fix` applies the ones with a single possible remedy, `bun run
format:fix` rewrites in place, and a workspace's own `AGENTS.md` names its
narrowest check and test.

Two commands stay outside `verify` on purpose. `bun run test:e2e` needs a
Playwright browser, and `bun run doctor` asserts machine prerequisites, which is
not something CI can assert about itself.

CI runs `bun run verify` and adds only what the command cannot contain: a
`git diff --exit-code` after the build and after `bun run generate`, because
those need a clean git tree; the three layer scripts, because `bun run test`
passes whether or not their filters match anything; `test:coverage` for the
uploaded artifact; and the E2E and Desktop jobs, which need a browser and other
operating systems.

`bun run test:e2e` starts the Web and Admin development servers itself.
Install the local browser once with:

```bash
bun run --cwd e2e playwright install chromium
```

CI installs Chromium and its Linux dependencies with the workspace-local
`bun run --cwd e2e playwright install --with-deps chromium` command before
running the E2E job.

Desktop native checks:

```bash
cd apps/desktop/src-tauri
cargo fmt --check
cargo check
cargo clippy --all-targets -- -D warnings
```

Each workspace must complete its local TypeScript check independently. The root
Vite+ task graph runs checks, tests, and builds across all applications and
packages. `bun run verify` deliberately sets `NITRO_PRESET=bun` for its build
graph to prove that each Node deployment owns an explicit preset. After the
build, it reads each Web and API `.output/nitro.json`, requires the `node-server`
preset, and starts each generated server with the repository's Node runtime on
a temporary loopback port. One Web process must serve both `/` and `/health`;
the standalone compatibility output must also serve `/health`. The probe
supplies a non-routable database URL and exercises no database query.

## Vite+/Vitest configuration boundary

Every application and test-bearing package owns a separate `vitest.config.ts`.
The test command is `vp test --run`, which reads that file; the application
`vite.config.ts` is reserved for `dev`, `build`, and SSR. Unit tests therefore
do not load TanStack Start, Nitro, React, Tailwind, or evlog application
plugins.

Loading the complete application plugin pipeline in Vite+'s test module runner
causes React 19's CommonJS entry to be evaluated as an inlined ESM module. The
visible symptoms are:

```text
ReferenceError: module is not defined
close timed out after 10000ms
```

**Every `vitest.config.ts` must stay.** Deleting one does not fall back to a
sane default — it lets the workspace's `vite.config.ts` plugin pipeline into the
runner, which is what produces the failure above. Do not reintroduce test-mode
branches into application Vite configs unless a specific plugin is genuinely
required by a test.

Run repository tests through:

```bash
bun run test
# or
vp run -r test
# or, for one workspace:
bunx vp test --run
```

Do not rely on a globally installed `vp` binary. Even when its version matches
the repository's `0.2.9`, its global install directory is a different physical
dependency tree from the workspace's `vite-plus/test` import. That splits the
runner from the test API and can fail before the first test with
`Cannot read properties of undefined (reading 'config')`. Workspace scripts are
safe because they resolve `vp` from the root `node_modules/.bin`, the same way
they already resolve `tsc` without declaring TypeScript.

`vp test` is Vite+'s built-in command and is the runner every workspace `test`
script calls. `vp run test`/`vpr test` runs the workspace script instead, so
`vp run -r test` is still the repository-wide entry point. There is no direct
`vitest` dependency: Vite+ bundles the runner, and the test API is imported from
`vite-plus/test`. `@vitest/coverage-v8` remains a direct dependency because
Vite+ does not bundle it; its version therefore has to keep matching the Vitest
that Vite+ ships.

The root `vitest.config.ts` excludes the Playwright `e2e/` workspace. It is a
file-discovery smoke config only: a root `bunx vp test --run` collects every
workspace's tests into one process, where per-workspace `setupFiles` and
environments do not apply, so `jest-dom` matchers are missing and jsdom stubs
such as `window.matchMedia` are absent. Expect failures from that invocation and
use `vp run -r test` for a real repository-wide run.

## Test layers

Tests are classified by filename so a workspace can run a focused layer without
loading another application's plugin pipeline:

| Layer       | File pattern               | Purpose                                                |
| ----------- | -------------------------- | ------------------------------------------------------ |
| Unit        | `*.test.ts(x)`             | Pure functions, contracts, repositories, and utilities |
| Integration | `*.integration.test.ts(x)` | API boundaries and in-memory adapters                  |
| Component   | `component.test.tsx`       | React UI behavior in `jsdom`                           |
| E2E         | `e2e/tests/*.spec.ts`      | Browser smoke tests across running applications        |

`test:unit` selects its layer by excluding the other two patterns, while
`test:integration` and `test:component` select theirs with vitest's positional
argument. **That argument is a substring filter, not a glob.** A glob there
matches no file and still exits 0 under `--passWithNoTests`, which is how twelve
workspaces once ran zero integration and zero component tests while reporting
green. The four layer scripts are byte-identical in every workspace that owns a
`vitest.config.ts`; `bun run policy` holds them to that single form, and the form
itself lives in `packages/scripts/src/policy/manifests.ts`. Change it there, then
run `bun run policy` for the paste-ready fix in each workspace.

Node workspaces use the Node test environment. `packages/ui` is the only
workspace that uses `jsdom`; its setup is local to the package so DOM globals
do not leak into server, desktop, or library type checks. E2E tests live in the
private `@voidmix/e2e` workspace and use separate Playwright projects for the
public Web surface and protected Admin routes. Both run against the integrated
Web server on port `3000`, which the config reuses during local iteration.

Run a single browser project or inspect its report with:

```bash
bun run --cwd e2e e2e -- --project=web
bun run --cwd e2e e2e -- --project=admin
bun run --cwd e2e test:report
```

## Acceptance expectations

- Browser, Node, React library, and Bun-specific types do not leak across
  workspace boundaries.
- Web and Desktop share contracts/client types but not route trees; Admin routes
  belong to Web's generated route tree.
- Ordinary users cannot access protected Admin procedures.
- Admin writes produce audit records and enforce self/final-admin protections.
- Mail settings enforce separate read, ordinary-write, secret-write, and test
  permissions; read responses and audit metadata never expose the API key.
- Auth settings reject ordinary users, allow Admin and Owner reads, and reserve
  writes for Owner. Tests cover dynamic registration/domain/email-policy guards,
  per-field set/reset/default restoration, redacted audits, and no-op updates.
- The unauthenticated Auth capability procedure returns only three booleans;
  public registration and tokenless reset UI follows them, fails open on request
  failure, and keeps existing reset-token flows usable.
- Settings tests distinguish omission (retain), `set`/`replace` (database
  override), and `reset` (delete and inherit), including secret redaction and
  source transitions.
- Missing production mail configuration leaves health and login available while
  mail-dependent Auth operations return `MAIL_NOT_CONFIGURED` with HTTP 503.
- Database scripts are tested against disposable development/test data.
- CI builds Web/API on Linux and Desktop packages on macOS and Windows.
- CI runs each Vitest layer separately and uploads workspace coverage reports as
  an artifact without enforcing a minimum threshold.
- CI runs public Web and protected Admin-route Playwright smoke tests in a separate Linux E2E job after
  installing Chromium.

# @voidmix/e2e

## Purpose

Browser end-to-end smoke tests for Web and Admin. A private workspace that is
deliberately separate from Vitest.

## Interface

```text
playwright.config.ts   projects, baseURLs, and the webServer definitions
tests/web.spec.ts      Web smoke project
tests/admin.spec.ts    Admin smoke project
```

Scripts: `e2e` (the run), `test:ui`, `test:report`, `check`.

## Ownership

- Own the Playwright projects, their `baseURL`s, and the `webServer` configuration
  that starts both applications.
- Own no unit or integration coverage. Those live beside the code they test.

## Constraints

- **This workspace has no `test` script on purpose.** `vp run -r test` therefore
  skips it, which is what keeps E2E out of the default test command — it starts
  application servers and needs browser binaries. Do not add a `test` script.
- Run it explicitly with `bun run test:e2e`; install browsers with
  `bun run --cwd e2e playwright install chromium`.
- Import from `@playwright/test`, **not** `vite-plus/test`. This is the one
  test-bearing workspace where that is correct.
- Spec files live in `tests/` and are named `*.spec.ts`, matched per project by
  `testMatch`. A file that matches neither project's pattern runs in no project
  and reports nothing.
- `webServer` owns application startup: both servers bind `127.0.0.1` on ports
  3000 and 3001 with `NODE_ENV=test`, and Admin receives its actor through
  `VITE_ACTOR_ID`/`VITE_ACTOR_ROLE`. Keep the ports aligned with each app's
  `strictPort` dev configuration or startup fails rather than falling back.
- `reuseExistingServer` is off in CI and on locally. Do not invert that.
- Assert through roles and accessible names rather than CSS selectors, so the
  tests keep verifying accessibility alongside behaviour.

## Verification

```bash
bun run --cwd e2e check
bun run --cwd e2e playwright install chromium   # first run only
bun run test:e2e
```

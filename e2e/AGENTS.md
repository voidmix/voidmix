# @voidmix/e2e

## Purpose

Browser smoke tests for Web, protected Admin routes, and Desktop. A
private workspace that is deliberately separate from Vitest.

## Interface

```text
playwright.config.ts   projects, baseURLs, and the webServer definitions
tests/web.spec.ts      Web home, language switching, and project-access smoke tests
tests/admin.spec.ts    Admin smoke project
tests/desktop.spec.ts  Desktop theme, locale, navigation, settings and keyboard checks
```

Scripts: `e2e` (the run), `test:ui`, `test:report`, `check`.

## Ownership

- Own Playwright projects and startup for API, Web and the Desktop browser preview.
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
  `testMatch`. A file that matches no project pattern runs in no project
  and reports nothing.
- `webServer` starts Web at `VOIDMIX_E2E_PORT` (default 3000), Desktop at +1,
  and API at +2 with `NODE_ENV=test`. Web/Admin share Web; Desktop has its own
  project. Admin verifies the unauthenticated redirect without actor headers.
- `reuseExistingServer` is off in CI and on locally. Do not invert that.
- Assert through roles and accessible names rather than CSS selectors, so the
  tests keep verifying accessibility alongside behaviour.

## Verification

```bash
bun run --cwd e2e check
bun run --cwd e2e playwright install chromium   # first run only
bun run test:e2e
```

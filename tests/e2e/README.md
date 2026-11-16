# End-to-end tests

Playwright exercises built applications through real browser pages, HTTP requests, and CLI subprocesses. This workspace owns `playwright.config.ts`, isolated test origins in `environment.ts`, migration setup, and the specs.

```sh
bun run test:e2e:install
E2E_DATABASE_URL=postgresql://.../voidmix_e2e bun run test:e2e
```

Run from the repository root. An explicit disposable PostgreSQL database is required even for filtered projects; setup applies the committed Drizzle migrations. Never substitute a development or production database.

The Turbo task builds API, Web, desktop SPA, Expo, and CLI first. Playwright starts API, Web, Expo Web, and desktop static preview on ports 4312, 4310, 4311, and 4313. It does not reuse existing servers. Keep public client API URLs aligned with those origins.

Use `-- --project=api`, `chromium`, `mobile-chromium`, `cli`, `expo-web`, or `desktop-web` to filter. The full project matrix, infrastructure setup, artifacts, and native limits are in [testing](../../docs/testing.md).

Use visible outcomes and real protocol responses. Keep fixtures isolated through unique identities and clean up only resources owned by the test. The desktop bridge fixture is deliberately simulated; it cannot establish native Go, WebView, or keyring behavior.

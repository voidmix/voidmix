# Applications

This document describes what each application is for, how it is built, and how
it is deployed. Each application's own `AGENTS.md` owns its interface,
constraints, and verification commands; keep those details there rather than
duplicating them here.

## Web

`apps/web` is the public/product-facing TanStack Start application.

- Uses `@voidmix/ui` and owns Web-specific routes, metadata, SSR, and content.
- Runs on port `3000` in development.
- Produces a TanStack Start server bundle and a browser bundle.
- Accesses backend functionality through the shared typed client.

## Admin

`apps/admin` is an independently built and deployed TanStack Start operations
console.

- Runs on port `3001` in development.
- Owns Admin navigation, tables, filters, layouts, and route trees.
- Uses `@voidmix/client` for the API and may use deterministic preview data
  during local UI development.
- Does not enforce final authorization in the browser; the API does.

The current Admin surface supports user search, status filtering, and account
activation or suspension. API-side domain rules prevent self-suspension and
disabling the final active administrator. Every Admin write produces a durable
audit event.

## Desktop

`apps/desktop` is a Tauri 2 application with a React/Vite renderer.

- Shares `@voidmix/ui`, `@voidmix/client`, and `@voidmix/contracts`.
- Uses a Vite SPA rather than TanStack Start SSR.
- Rust owns tray behavior, notifications, window lifecycle, and native
  commands.
- Closing the main window hides it to the tray; the tray can show, hide, or
  quit the application.
- The first release targets macOS and Windows.
- The first version is cloud-backed and does not provide offline sync.

The native seam lives in `apps/desktop/src-tauri/src/lib.rs`. A separate
background agent/process is intentionally deferred until a real requirement
justifies its lifecycle and resource cost.

## Storybook

`apps/storybook` is the development workbench for `@voidmix/ui` primitives.

- Runs on port `6006` in development.
- Owns component stories and visual documentation, not product routes or API
  calls.
- Loads the shared Tailwind v4 tokens and `packages/ui/src/styles.css` so
  stories exercise the same design system as the applications.
- Provides a Light/Dark toolbar backed by `@voidmix/ui`'s `ThemeProvider`.
- Is not a production runtime or deployment target.

## API

`apps/api` uses Nitro as its server and deployment shell. Hono is the HTTP
middleware and routing layer, and the oRPC Fetch handler is mounted under
`/rpc`.

- Development runs on port `3002`.
- Production emits Nitro's Node output under `.output/server/`.
- `scripts/start.mjs` starts the service while honoring `PORT` and
  `NITRO_PORT`.
- `src/app.ts` is directly testable without starting Nitro.
- `src/runtime.ts` owns database and logger initialization.
- `plugins/lifecycle.ts` closes runtime resources through Nitro's `close` hook.

Current procedures:

```text
health
admin.users.list
admin.users.get
admin.users.updateStatus
admin.audit.list
```

`GET /health` is available for service probes. Without `DATABASE_URL`, the API
uses a seeded in-memory repository so local applications can run without
PostgreSQL.

The oRPC beta transport uses GET for read-only procedures and POST for status
updates. The client and Fetch handler batch concurrent reads, deduplicate
identical in-flight reads, compress payloads above 1 KiB, propagate an
`x-request-id` response header, retry rate-limited/unavailable reads when the
server supplies `Retry-After`, enforce a 1 MiB request-body limit, and enforce a
15-second request deadline. GET procedures are guarded by oRPC's CSRF protection
plugin.

The API emits one Evlog wide event per HTTP/oRPC operation. Hono instruments
non-RPC routes, while the oRPC adapter records procedures and errors for
`/rpc/**` without double-logging the request.

# Applications

This document describes what each application is for, how it is built, and how
it is deployed. Each application's own `AGENTS.md` owns its interface,
constraints, and verification commands; keep those details there rather than
duplicating them here.

## Web

`apps/web` is the public/product-facing TanStack Start application and the
browser composition root for authentication and Admin operations.

- Uses `@voidmix/ui` and owns Web-specific routes, metadata, SSR, and content.
- Route files declare URLs and may compose a small number of feature entrypoints;
  the home route directly mounts the home navbar and chat shell.
- Feature roots keep components, state, data, fixtures, tests, and styles;
  larger features place internal presentation components under a local
  `components/` directory.
- The home prompt is implemented by the feature-local chat shell under
  `apps/web/src/features/chat/`. Its preview starts with an empty composer and
  creates deterministic local responses after submission; it does not call the
  API.
- Authentication pages are grouped under `(auth)/route.tsx` and retain the
  public `/login`, `/register`, `/reset-password`, and `/verify-email` URLs.
- `(app)/route.tsx` owns the browser session gate. The nested `(admin)` group
  mounts the Admin shell and `/admin` user directory, while
  `@voidmix/api-runtime` remains authoritative for authentication,
  authorization, suspended users, and audit rules.
- Admin-specific adapters, tables, filters, and layouts stay isolated under
  `apps/web/src/features/admin`; fusion removes a deployment unit without
  turning those modules into public-home concerns.
- Runs on port `3000` in development.
- Produces a TanStack Start server bundle and a browser bundle.
- Mounts `@voidmix/api-runtime` at `/api/auth/*`, `/rpc/*`, and `/health`
  through explicit Nitro Web-format routes.
- Uses the shared typed client with same-origin cookie requests.
- Requires `DATABASE_URL` and the server Auth/Mail environment at startup.

## Desktop

`apps/desktop` is a Tauri 2 application with a React/Vite renderer.

- Shares `@voidmix/ui`, `@voidmix/client`, and `@voidmix/contracts`.
- Uses a Vite SPA rather than TanStack Start SSR.
- Rust owns tray behavior, notifications, window lifecycle, and native
  commands.
- The renderer mounts feature pages directly from `src/features/`; `App.tsx` is
  only a compatibility export surface.
- Closing the main window hides it to the tray; the tray can show, hide, or
  quit the application.
- The first release targets macOS and Windows.
- The first version is cloud-backed and does not provide offline sync.
- `src/lib/cloud/source.ts` selects the remote or deterministic demo source;
  page components do not own transport, validation, or fallback behavior.

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

## API compatibility host

`apps/api` is a temporary standalone Nitro deployment shell for
`@voidmix/api-runtime`. Web is the default API host; the compatibility service
retains port 3002 and the same endpoint paths for external migrations.

- Development runs on port `3002`.
- Production emits Nitro's Node output under `.output/server/`.
- `scripts/start.mjs` starts the service while honoring `PORT` and
  `NITRO_PORT`.
- `server/runtime.ts` memoizes the shared runtime and owns the host lifecycle.
- `server/runtime.plugin.ts` closes runtime resources through Nitro's `close` hook.

Current procedures:

```text
health
admin.users.list
admin.users.get
admin.users.updateStatus
admin.audit.list
```

`GET /health` is available on both Web and the compatibility service. The
runtime requires `DATABASE_URL`; the seeded in-memory repository is reserved
for direct `@voidmix/api-runtime` tests that inject it explicitly.

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

Better Auth is mounted at `/api/auth/*` with credentialed CORS. Admin uses the
HTTP-only cookie session; the public Web app remains unauthenticated. Auth email
verification, password reset, and welcome messages are sent through the typed
`@voidmix/mail` service.

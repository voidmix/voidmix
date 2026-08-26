# Applications

This document describes what each application is for, how it is built, and how
it is deployed. Each application's own `AGENTS.md` owns its interface,
constraints, and verification commands; keep those details there rather than
duplicating them here.

## Web

`apps/web` is the public/product-facing TanStack Start application and the
browser composition root for authentication and Admin operations.

- Uses `@voidmix/ui` and owns Web-specific routes, metadata, SSR, and content.
- Serves `/manifest.webmanifest` through a TanStack Start server route with the
  VoidMix name, launch scope, theme, and shared 512×512 brand mark for
  install-capable browsers.
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
  mounts the Admin shell, `/admin` user directory, and `/admin/settings` mail
  configuration. `/admin/settings/auth` exposes registration and Auth-mail
  policy as read-only for Admin and writable for Owner. Settings fields show
  their effective source and safe inherited value; reset deletes the database
  override instead of persisting the fallback. Public Auth pages consume a
  separate three-boolean capability view and fail open when it cannot be loaded,
  while
  `@voidmix/api-runtime` remains authoritative for authentication,
  authorization, suspended users, and audit rules.
- Admin-specific adapters, tables, filters, and layouts stay isolated under
  `apps/web/src/features/admin`; fusion removes a deployment unit without
  turning those modules into public-home concerns.
- Runs on port `3000` in development.
- Produces a TanStack Start server bundle and a browser bundle.
- Resolves locale from the `locale` Cookie, `Accept-Language`, then English; the
  document and React provider share the loader result for hydration safety.
- Mounts the statically imported English and Chinese catalog through
  `@voidmix/i18n`. Feature components select a namespace through the facade;
  there are no generated loaders or i18n Suspense boundaries during SSR or
  hydration. The tradeoff is that the application bundle contains both
  supported locales.
- Mounts `@voidmix/api-runtime` at `/api/auth/*`, `/rpc/*`, and `/health`
  through explicit Nitro Web-format routes.
- Uses the shared typed client with same-origin cookie requests.
- Requires `DATABASE_URL` and the server Auth environment at startup. Mail may
  be configured later through Admin or supplied through compatibility variables.

## Desktop

`apps/desktop` is a Tauri 2 application with a React/Vite renderer.

- Shares `@voidmix/ui`, `@voidmix/client`, and `@voidmix/contracts`.
- Uses a Vite SPA rather than TanStack Start SSR.
- Resolves locale from localStorage, `navigator.language`, then English and
  switches synchronously against the statically mounted catalog.
- Uses lazy route components so feature code remains separate from the shell
  and shared static catalog.
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
public.auth.capabilities.get
admin.users.list
admin.users.get
admin.users.updateStatus
admin.audit.list
admin.settings.mail.get
admin.settings.mail.update
admin.settings.mail.sendTest
admin.settings.auth.get
admin.settings.auth.update
```

`GET /health` is available on both Web and the compatibility service. The
runtime requires `DATABASE_URL`; the seeded in-memory repository is reserved
for direct `@voidmix/api-runtime` tests that inject it explicitly.

The oRPC beta transport uses GET for read-only procedures and POST for status or
settings updates and test delivery. The client and Fetch handler batch concurrent reads, deduplicate
identical in-flight reads, compress payloads above 1 KiB, propagate an
`x-request-id` response header, retry rate-limited/unavailable reads when the
server supplies `Retry-After`, enforce a 1 MiB request-body limit, and enforce a
15-second request deadline. Hono preserves a valid incoming `X-Request-Id` and
generates a 21-character Nano ID when one is absent or invalid. GET procedures
are guarded by oRPC's CSRF protection plugin.

The API emits one Evlog wide event per HTTP/oRPC operation. Hono instruments
non-RPC routes, while the oRPC adapter records procedures and errors for
`/rpc/**` without double-logging the request.

Better Auth is mounted at `/api/auth/*` with credentialed CORS. Admin uses the
HTTP-only cookie session; the public Web app remains unauthenticated. Auth email
verification, password reset, and welcome messages are sent through the typed
`@voidmix/mail` service. Database mail settings override environment fallbacks
and are resolved for every send. Admin responses contain safe effective values,
per-field sources, and inherited previews, while the server-only runtime result
retains the Resend value. Mail-dependent Auth operations return 503 when
configuration is disabled or incomplete without taking down the host.

Registration mode, exact allowed email domains, and verification/reset/welcome
delivery switches are typed database settings. Relevant Auth requests resolve
them immediately before handling, so an Owner update applies without restarting
the process. Public registration and recovery navigation receives only derived
availability booleans, never the domain list, sources, missing fields, or secret
state. Policy rejection uses stable code-only payloads and does not affect
verified-user login. Diagnostic messages are not part of the client contract;
renderer surfaces translate codes locally.

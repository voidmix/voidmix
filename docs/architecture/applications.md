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
- Authentication pages are grouped under `(auth)/route.tsx` and expose public
  `/login`, `/signup`, `/reset-password`, and `/verify-email` URLs. Login and
  signup validate an internal `redirect` search parameter so protected
  navigation can return to its original destination without creating an open
  redirect. Signup also gives Better Auth a same-origin verification callback,
  so the email flow returns to the Web verification state before the user signs
  in.
- `(app)/route.tsx` owns the browser session gate. The nested `(admin)` group
  mounts the Admin shell, `/admin` user directory, and `/admin/settings` mail
  configuration. `/admin/settings/auth` exposes registration and Auth-mail
  policy as read-only for Admin and writable for Owner. Settings fields show
  their effective source and safe inherited value; reset deletes the database
  override instead of persisting the fallback. Public Auth pages consume a
  separate three-boolean capability view and fail open when it cannot be loaded,
  while
  `apps/api/server/api` remains authoritative for authentication,
  authorization, suspended users, and audit rules.
- Admin-specific adapters, tables, filters, and layouts stay isolated under
  `apps/web/src/features/admin`; fusion removes a deployment unit without
  turning those modules into public-home concerns.
- Runs on port `3000` in development.
- Produces a TanStack Start server bundle and a browser bundle.
- Resolves locale from the `locale` Cookie, `Accept-Language`, then English; the
  document and React provider share the loader result for hydration safety.
- Loads only the resolved Web locale catalog before SSR through the root loader
  and mounts it with `AsyncI18nProvider` from `@voidmix/i18n`. The Web-owned
  loader map dynamically imports the other locale on language switch; feature
  components select namespaces through the facade. Recovery pages retain their
  independent static copy.
- Calls the standalone API origin through the shared typed client with
  credentialed cookie requests; it does not mount API handlers.
- Project and task data use the standalone API origin through the shared client.
  Preview routes remain explicitly labelled while live resource rollout continues.
- The API owns `DATABASE_URL`, Auth, mail, Redis, and persistence composition.

## Desktop

`apps/desktop` is a Tauri 2 application with a TanStack Start SPA renderer.

- Shares `@voidmix/ui`, `@voidmix/client`, and `@voidmix/contracts`.
- Uses Start file routing and SPA mode with RSC disabled. The Start server build
  is used only to prerender `dist/client/index.html`; Tauri embeds that client
  directory and does not ship a JavaScript server runtime.
- Resolves locale from localStorage, `navigator.language`, then English after
  hydrating the deterministic English build-time shell, and switches
  synchronously against the statically mounted catalog.
- Uses lazy route components so feature code remains separate from the shell
  and shared static catalog.
- Desktop navigation now exposes Home, Projects, Library, Activity, and
  Settings. Devices remains available from Settings, and Project/Library
  screens currently use labelled deterministic preview content while their live
  Project Studio adapter is rolled out.
- Owns no Start server functions or server routes. Runtime data continues to
  come from the cloud API through `@voidmix/client`.
- Rust owns tray behavior, notifications, window lifecycle, and native
  commands.
- The renderer mounts feature pages directly from `src/features/`; `App.tsx` is
  only a compatibility export surface.
- Closing the main window hides it to the tray; the tray can show, hide, or
  quit the application.
- The first release targets macOS and Windows.
- The first version is cloud-backed and does not provide offline sync.
- `src/lib/project-studio.ts` uses the account-first V2 Project procedures for
  authenticated project listing, creation, and detail reads; page components
  do not own transport or validation. Preview data remains only for an
  unconfigured API URL.

The native seam lives in `apps/desktop/src-tauri/src/lib.rs`. Desktop accesses
Agent capabilities through the API and does not embed the server-side AI
adapter.

## Worker

`apps/worker` is the durable execution host for Agent and outbox work.

- Claims outbox events with PostgreSQL leases and dispatches them through an
  injected application handler.
- Shares application commands with the API without importing HTTP sessions or
  UI state.
- Stops claiming on shutdown; unacknowledged work remains reclaimable after its
  lease expires.

## Storybook

`apps/storybook` is the development workbench for `@voidmix/ui` primitives.

- Runs on port `6006` in development.
- Owns component stories and visual documentation, not product routes or API
  calls.
- Loads the shared Tailwind v4 tokens and `packages/ui/src/styles.css` so
  stories exercise the same design system as the applications.
- Provides a Light/Dark toolbar backed by `@voidmix/ui`'s `ThemeProvider`.
- Is not a production runtime or deployment target.

## API application

`apps/api` is the standalone Nitro deployment and the only HTTP composition
root. Its internal `server/api` modules own Hono, oRPC, Auth, and persistence
composition; Web does not host API routes.

- Development runs on port `3002`.
- Production emits Nitro's Node output under `.output/server/`.
- `scripts/start.mjs` starts the service while honoring `PORT` and
  `NITRO_PORT`.
- `server/runtime.ts` memoizes the shared runtime and owns the host lifecycle.
- `server/runtime.plugin.ts` closes runtime resources through Nitro's `close` hook.

Current procedures:

```text
health
account.profile.get
v2.projects.list / get / create
v2.projects.tasks.list / create / update
public.auth.capabilities.get
workspace.assets.create
workspace.assets.get
workspace.assets.commitVersion
workspace.assets.resolveConflict
workspace.agents.runs.create
workspace.agents.runs.get
workspace.agents.runs.transition
workspace.agents.runs.acquireLease
workspace.agents.runs.heartbeat
workspace.agents.steps.create
workspace.agents.steps.transition
admin.users.list
admin.users.get
admin.users.updateStatus
admin.audit.list
admin.settings.mail.get
admin.settings.mail.update
admin.settings.mail.sendTest
admin.settings.auth.get
admin.settings.auth.update
studio.snapshot.get
projects.list / get / create / update / archive / restore
projects.tasks.list / create / update
library.search
reviews.list / create / update / resolve
activity.list
pi.sessions.create / get / cancel / retry
```

`GET /health` is available on the standalone API and Web liveness shell. The
runtime requires `DATABASE_URL`; the seeded in-memory repository is reserved
for direct `apps/api/server/api` tests that inject it explicitly.

The oRPC beta transport uses GET for read-only procedures and POST for every
mutation, including asset commits, conflict resolution, Agent transitions, and
lease operations. The client and Fetch handler batch concurrent reads, deduplicate
identical in-flight reads, compress payloads above 1 KiB, propagate an
`x-request-id` response header, retry rate-limited/unavailable reads when the
server supplies `Retry-After`, enforce a 1 MiB request-body limit, and enforce a
15-second request deadline. Hono preserves a valid incoming `X-Request-Id` and
generates a 21-character Nano ID when one is absent or invalid. GET procedures
are guarded by oRPC's CSRF protection plugin.

The API emits one Evlog wide event per HTTP/oRPC operation. Hono instruments
non-RPC routes, while the oRPC adapter records procedures and errors for
`/rpc/**` without double-logging the request.

Better Auth is mounted at `/api/auth/*` with credentialed CORS. Production
sessions use parent-domain, HTTP-only, Secure, SameSite=None cookies so Web and
Desktop can reuse the API session. Admin uses the
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

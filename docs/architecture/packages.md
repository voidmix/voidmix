# Shared Packages

This document describes what each package is for and why its seam sits where it
does. Each package's own `AGENTS.md` owns its export surface, constraints, and
verification commands; keep those details there rather than duplicating them
here.

## `@voidmix/contracts`

The runtime contract seam. It contains Zod schemas, DTOs, and the oRPC contract
tree, but performs no network calls and exposes no database implementation.
Settings DTOs model effective values, sources, inherited safe values, and
optional per-field mutations. The public Auth capability DTO intentionally
contains only three booleans.

## `@voidmix/client`

The transport adapter. `createApiClient({ baseUrl?, headers, fetch })` returns a
typed client generated from the shared contract. Web omits `baseUrl` for
same-origin `/rpc`; Desktop supplies an absolute cloud origin.

## `@voidmix/api-runtime`

The server-side transport and composition adapter shared by Web and the
temporary standalone API host. It owns Hono routes, oRPC handlers, Better Auth
session resolution, permission enforcement, CORS, mail composition, dynamic
authentication-policy enforcement, and the single pooled database runtime. It
exports process-scoped `ApiModules`, request-scoped Auth context types, factories,
and an environment preset, but owns no Nitro listener or process lifecycle.
Hono resolves one application session per RPC request; oRPC permission middleware
injects a non-null principal into protected handlers. Better Auth database IDs are
generated as UUID v7 values so
new records retain time-ordered locality while remaining globally unique.

## `@voidmix/cache`

The optional server-side Redis cache adapter. It exposes a Laravel-like cache
facade with seconds-based TTLs, atomic add/pull/counter operations, prefix-scoped
flush, and a raw-string Better Auth secondary-storage adapter. Redis is never
silently replaced by an in-memory fallback. API runtime uses it for Better Auth
session/rate-limit/verification secondary storage and for a short-lived Auth
policy cache; Admin settings views and mail secrets remain database-backed.

## `@voidmix/core`

Framework-independent business rules and repository interfaces. It owns:

- User and audit event types.
- User listing and cursor pagination.
- User status transitions.
- Self-suspension and final-administrator protection.
- Idempotent initial administrator creation.
- Durable audit event creation.
- Typed mail settings validation, availability checks, and audit creation.
- Typed authentication policy normalization and audit creation.
- Settings source/inheritance vocabulary and derived public Auth capabilities.

It does not import React, Hono, Nitro, or Drizzle.

## `@voidmix/auth`

The authorization vocabulary: roles (`user`, `admin`, `owner`), permissions,
session types, and `hasPermission`.

The role grants are explicit permission allowlists; adding a permission to the
vocabulary does not implicitly grant it to Admin or Owner.

Authentication policy has separate permissions: Admin and Owner can read it,
while only Owner can update it.

`@voidmix/api-runtime` owns the Better Auth adapter and production cookie
session resolver. The development header resolver remains available for
injected tests and local preview only; the oRPC router and core services do
not depend on the provider.

## `@voidmix/mail`

Typed auth mail delivery for verification, password reset, welcome, and
administrator test emails.
Its JSON catalogs are rendered through the server-only `@voidmix/i18n`
translator using `MAIL_DEFAULT_LOCALE`, which falls back to English.
React Email templates always provide HTML and plain-text output. Resend is the
production transport; development and test use a logger transport without
network access. Production throws `MailUnavailableError` at delivery time when
configuration is unavailable, rather than failing process startup or silently
using the logger transport. The package exposes only server-side mail interfaces.

## `@voidmix/i18n`

The locale and translation facade shared by renderer and server packages. It
owns `en`/`zh` normalization, Accept-Language and Cookie parsing, browser and
Desktop storage adapters, Intl formatters, the synchronous and asynchronous
React providers, and the internal `use-intl` integration. Applications and
Mail own their catalog files.

The package exposes a small catalog-loader type but no application-specific
loader or generated runtime output. Web uses the async provider with its own
explicit locale-to-import map; Desktop and Mail remain synchronous. Domain and
contracts remain independent of i18n.

## `@voidmix/env`

The environment seam exposes `createEnv`, `defineEnv`, `Preset`, and
`runtimeEnv`.

- It validates values supplied by the runtime; it does not read `.env` files.
- Packages declare owned variables through local presets.
- Applications compose package presets with application-specific server,
  client, and shared variables.
- `VITE_` variables are statically constrained for browser use.
- Blank strings normalize to `undefined`; defaults apply before validation.
- Preset composition detects circular `extends` graphs.
- Callers should not scatter direct `process.env` or `import.meta.env` reads.

Representative composition:

```ts
const env = createEnv({
  extends: [runtimeEnv, loggerEnv, databaseEnv],
  server: {
    ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  },
});
```

## `@voidmix/db`

The database adapter package.

- Drizzle PostgreSQL schema lives in `src/schema.ts`.
- `PostgresUserRepository` and `PostgresSystemSettingsRepository` are the
  production adapters; matching in-memory adapters support development/tests.
- `system_settings` stores typed ordinary configuration keys and
  `system_secrets` stores write-only secret values. Both record the updater and
  timestamp.
- Authentication policy reuses `system_settings`: registration mode, an exact
  email-domain allowlist encoded as JSON text, and the welcome, verification,
  and password-reset email switches. Only typed repository methods can access
  these fixed keys.
- Resolution is field-scoped. Database values override mail environment/default
  fallbacks; Auth values override built-in defaults. Omitted mutations retain a
  row, `set`/`replace` upsert it, and `reset` deletes it. Admin views include
  sources and safe inherited previews, while runtime resolvers omit that
  presentation metadata and retain server-only secret material.
- Audit targets distinguish `user` from `system_setting`. `actor_id` always
  references a user; the generated nullable `target_user_id` preserves a
  restrictive user foreign key while allowing `target_id = mail` for settings.
- SQL migrations live under `drizzle/`.
- Database tables and Drizzle details are not exposed to frontend apps.

Authentication policy is read for every registration, verification-email,
password-reset, and welcome-email decision. It is not cached for the process
lifetime, so Owner changes apply without a restart.

## `@voidmix/logger`

The observability seam wraps Evlog so services share naming, environment
detection, minimum levels, event shape, and redaction policy.

- Node services call `configureLogger({ service })` once during startup.
- Jobs and lifecycle hooks create a scoped wide event with
  `logger({ operation })` and emit it after enrichment.
- Hono and oRPC adapters produce one event with duration, request ID, actor,
  authorization result, outcome, and status.
- Scripts use the same structured event shape.
- Tooling can provide an explicit `runtimeEnv` when logger configuration must
  use a copied child environment instead of global `process.env`.
- Web and Desktop use the Vite client integration.
- Authorization headers, cookies, passwords, secrets, tokens, and API keys are
  redacted by default.

Operational logs and Admin audit records are separate concepts. Logs are
observability data; audit rows are durable product records.

## `@voidmix/ui`

Shared visual primitives and design-system utilities:

- Base UI interactive primitives.
- shadcn `base-nova` component conventions.
- Phosphor Icons for renderer surfaces.
- Tailwind CSS v4 variables and theme tokens.
- SSR-safe `ThemeProvider`, `ThemeScript`, and `useTheme` for light, dark, and
  system themes.
- Base-nova `Button`, `Badge`, `Avatar`, `Card`, `DropdownMenu`, `Menubar`, and
  `Separator` components, plus the product-specific `Logo`.
- A lazy Toast manager bridge exposed through `@voidmix/ui/toast`; it loads the
  concrete Toast implementation only when the first notification is added.
- `cn` and CVA helpers for composition.
- Shared base-nova semantic colors, focus, radius, and motion tokens from
  `packages/ui/src/styles/globals.css`.

Each renderer has a `components.json` that targets the shared UI package with
`style: "base-nova"`, `rsc: false`, and `iconLibrary: "phosphor"`. Page layout,
route trees, and product-specific visual composition remain in their owning
application so migration can happen incrementally.

Import generated UI primitives through their explicit
`@voidmix/ui/components/ui/<component>` subpath. The package root intentionally
does not re-export components so bundlers can tree-shake each primitive
independently. Product wrappers such as `Avatar` and `Logo` retain their own
top-level subpaths. Renderer applications that need deferred notifications use
`@voidmix/ui/toast`; the concrete Toast implementation remains available at
`@voidmix/ui/components/ui/toast` for direct UI-package tests and composition.

## `@voidmix/scripts`

A private Bun CLI for procedural repository automation. Vite+ owns the task
graph; Scripts owns operations that understand the repository or database.
Runtime applications must never import this package.

The existing `vmx` bin also exposes `vmx env -- <command>`. This
development/build runner uses Dotenvx's programming API to load root
`.env.local` and `.env` into a copied child environment, preserves the caller's
working directory and stdio, forwards termination signals, and avoids loading
the same files again in nested runner calls. The internal marker is scoped to
the repository root, remains a runner implementation detail, and is not part of
any business schema.

The Citty command tree is split into lightweight domain command modules so each
concern can be tested without bootstrapping the complete CLI: pure operations
accept injectable dependencies, renderers are separate from the data they print,
and command adapters stay thin. `packages/scripts/AGENTS.md` records the source
layout and the conventions new modules must follow.

Policy orchestration lives in `src/policy/checks.ts`, while workspace, manifest,
documentation, skill, and TypeScript rules live in injected modules under
`src/policy/checks/` and `src/policy/manifests/`. Splitting those rule domains
must not change `runPolicy` or its finding output.

## `@voidmix/tsconfig`

Shared strict TypeScript presets. They define compiler behavior but never own
consumer `include`, `exclude`, `paths`, output directories, or project
references. See [Toolchain](./tooling.md) for the preset matrix.

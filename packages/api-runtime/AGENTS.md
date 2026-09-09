# @voidmix/api-runtime

## Purpose

The server-side API adapter shared by the Web host and the temporary standalone
API host. It composes Hono, oRPC, Better Auth, mail, and the database without
depending on Nitro or an application.

## Interface

| Path    | Purpose                                                         |
| ------- | --------------------------------------------------------------- |
| `.`     | App/runtime factories, `createApiModules`, context/module types |
| `./env` | `apiRuntimeEnv` and the validated runtime environment contract  |

## Ownership

- Own Hono routes, oRPC procedure handlers, permission enforcement, session
  resolution, workspace-membership access checks, CORS, Better Auth
  composition, dynamic mail/auth policy resolution, and production repository
  wiring.
- Resolve an optional request locale hint from the locale Cookie and
  `Accept-Language` header for every RPC context. CORS for both `/rpc/*` and
  `/api/auth/*` must allow `Accept-Language`; forward the hint to locale-aware
  mail callbacks and typed settings test mail when one is present, preserving
  the mailer's configured default otherwise.
- Own no domain rule, wire schema, deployment listener, or Nitro lifecycle.

## Constraints

- Hosts create one memoized runtime per process and close it from their own
  lifecycle hook. Never connect to PostgreSQL per request.
- The package must not read an application env module or initialize the global
  logger. Request adapters receive an explicit `api` logger config.
- Keep `/api/auth/*`, `/rpc/*`, and `/health` stable. Protected procedures must
  apply the matching permission middleware and retain ordinary-user rejection coverage.
- Mail-dependent Better Auth requests return `MAIL_NOT_CONFIGURED` with HTTP 503
  when settings are disabled/incomplete; health and verified-user login remain
  available.
- Keep Admin settings views, server-only runtime configuration, and
  `public.auth.capabilities.get` separate. The public procedure is unauthenticated
  and returns only three derived booleans; it never returns sources, domain
  allowlists, missing fields, or secret state.
- Registration, verification-email, and password-reset guards resolve typed
  Auth settings for every relevant request. Preserve the stable
  `REGISTRATION_DISABLED`, `EMAIL_DOMAIN_NOT_ALLOWED`,
  `EMAIL_VERIFICATION_DISABLED`, and `PASSWORD_RESET_DISABLED` responses.
- Map domain and mail failures to a stable transport code with
  `data.error.code` and optional primitive `values`; keep raw Error messages and
  operational diagnostics out of responses. Better Auth mail-policy responses
  retain the top-level code required by its handler and use the same nested
  envelope.
- `admin.settings.auth.get` requires Auth settings read permission;
  `admin.settings.auth.update` requires the separate Owner-only write
  permission. UI role checks never replace these handler guards.
- Mail ordinary mutations require mail-write permission. A Resend `replace` or
  `reset` in the same typed update additionally requires secret-write permission.
- Hono logs non-RPC requests and oRPC logs `/rpc/**`; preserve one wide event
  per request and never log credentials or session tokens.
- Keep the header session resolver as an explicit development/test seam. The
  production runtime always uses Better Auth and rejects suspended users. The
  resolver is not part of the package root interface.
- Workspace procedures require both the global permission and an active
  workspace membership. Missing membership configuration fails closed with
  `FORBIDDEN`; access is checked using the authenticated actor and resource
  workspace, never a client-supplied actor id.
- `createApiApp` requires explicit `ApiModules`, session resolver, origin policy,
  and Auth handler injection. `createApiModules` is the public process-scoped
  composition seam; seed repositories and header sessions belong only in tests.
- Request logs never derive user identity from actor headers. Authenticated user
  context is resolved once by Hono for `/rpc/*` and passed into oRPC. Better Auth
  routes keep their own handler and do not run the application session resolver.

See [`../../skills/voidmix-infra/references/orpc-procedures.md`](../../skills/voidmix-infra/references/orpc-procedures.md)
for procedure changes.

## Verification

```bash
bun run --cwd packages/api-runtime check
bun run --cwd packages/api-runtime test
bun run --cwd packages/api-runtime test:integration
```

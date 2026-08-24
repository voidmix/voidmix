# @voidmix/api-runtime

## Purpose

The server-side API adapter shared by the Web host and the temporary standalone
API host. It composes Hono, oRPC, Better Auth, mail, and the database without
depending on Nitro or an application.

## Interface

| Path    | Purpose                                                        |
| ------- | -------------------------------------------------------------- |
| `.`     | `createApiApp`, `createApiRuntime`, runtime and option types   |
| `./env` | `apiRuntimeEnv` and the validated runtime environment contract |

## Ownership

- Own Hono routes, oRPC procedure handlers, permission enforcement, session
  resolution, CORS, Better Auth composition, dynamic mail/auth policy
  resolution, and production repository wiring.
- Own no domain rule, wire schema, deployment listener, or Nitro lifecycle.

## Constraints

- Hosts create one memoized runtime per process and close it from their own
  lifecycle hook. Never connect to PostgreSQL per request.
- The package must not read an application env module or initialize the global
  logger. Request adapters receive an explicit `api` logger config.
- Keep `/api/auth/*`, `/rpc/*`, and `/health` stable. Protected procedures must
  call `requirePermission` and retain ordinary-user rejection coverage.
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
- `createApiApp` requires explicit users, session resolver, origin policy, and
  Auth handler injection. Seed repositories and header sessions belong only in
  tests; there is no production default identity.
- Request logs never derive user identity from actor headers. Authenticated user
  context is attached by the oRPC session resolver after Better Auth validation.

See [`../../skills/voidmix-infra/references/orpc-procedures.md`](../../skills/voidmix-infra/references/orpc-procedures.md)
for procedure changes.

## Verification

```bash
bun run --cwd packages/api-runtime check
bun run --cwd packages/api-runtime test
bun run --cwd packages/api-runtime test:integration
```

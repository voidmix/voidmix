# Environment

The Web/API runtime requires `DATABASE_URL` and uses Better Auth with
`AUTH_SECRET` and `AUTH_URL`. External browser origins are listed in
`ALLOWED_ORIGINS`.

Mail environment variables are server-only compatibility fallbacks:

```text
RESEND_API_KEY   production Resend credential
MAIL_FROM        verified production sender address
MAIL_FROM_NAME   sender display name
EMAIL_TEMPLATES_BASE_URL optional application URL used by welcome mail
MAIL_DEFAULT_LOCALE fallback locale when the recipient's is unknown (`en` or `zh`, defaults to `en`)
```

Admins and owners can manage the typed mail configuration at `/admin/settings`.
Runtime precedence is database `system_settings` / `system_secrets`, then the
variables above, then package defaults. The API resolves that state before each
delivery, so saving in Admin takes effect without restarting a process.

Each Admin field has an independent source: `database`, `environment`,
`default`, or `missing`. Leaving a field untouched retains its database state;
setting it writes an override; resetting it deletes the database row and
immediately restores the shown inherited environment/default value. Clearing an
ordinary mail text input schedules that reset. The Resend input is always blank:
blank retains the existing database key, replacement writes a new key, and the
explicit remove action resets to the environment key if one exists.

Development and test may omit the Resend key and sender address; the mail
package then uses its logger transport and never makes a network request.
Production starts without mail configuration so `/health`, login, and Admin
remain available. Registration, password-reset requests, verification-email
resends, and explicit test delivery return HTTP 503 with
`MAIL_NOT_CONFIGURED` until mail is ready. A failed welcome email after a
successful verification is logged as a non-critical, redacted side effect.

`mail.resend_api_key` is currently stored as plaintext in `system_secrets`.
The Admin API exposes only whether it is configured, its source, and whether an
inherited key exists; it never returns the value or places it in logs or audit
metadata. Database readers can still see the key, which is an accepted
first-version production risk.

Authentication policy has no environment-variable fallback. When its fixed
`system_settings` keys are absent, registration is open, every email domain is
allowed, and verification, password-reset, and welcome email behavior is
enabled. Owners can set or reset individual fields at `/admin/settings/auth`;
reset restores those defaults without storing them. Relevant requests read the
latest database values without a restart.

Unauthenticated pages use `public.auth.capabilities.get`, which returns only
registration, verification-email-request, and password-reset-request
availability booleans calculated from the current Auth policy and mail
readiness. It never exposes the email-domain allowlist, sources, missing fields,
or secret state. Browser failures fail open for navigation only; the server
still enforces every policy.

Browser code may read only explicitly declared public values from `apps/web/src/env.ts`.
Database, Auth, mail, origin, and server logger values are composed by
`apps/web/server/env.ts` and never enter the browser module graph. Web uses
relative same-origin paths for Better Auth and authenticated Admin requests.
Auth cookies are HTTP-only and requests include credentials. Desktop keeps an
optional absolute `VITE_API_URL` for the cloud host.

Local Web defaults `AUTH_URL` to `http://localhost:3000`; the standalone API
defaults it to `http://localhost:3002`. Leave the shared `.env` value blank to
use those host defaults, and set the public origin explicitly in production.

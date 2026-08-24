# Environment

The Web/API runtime requires `DATABASE_URL` and uses Better Auth with
`AUTH_SECRET` and `AUTH_URL`. External browser origins are listed in
`ALLOWED_ORIGINS`.

Mail settings are server-only:

```text
RESEND_API_KEY   production Resend credential
MAIL_FROM        verified production sender address
MAIL_FROM_NAME   sender display name
EMAIL_TEMPLATES_BASE_URL optional application URL used by welcome mail
```

Development and test may omit the Resend key and sender address; the mail
package then uses its logger transport and never makes a network request.
Production fails fast unless `RESEND_API_KEY` and `MAIL_FROM` are configured.

Browser code may read only explicitly declared public values from `apps/web/src/env.ts`.
Database, Auth, mail, origin, and server logger values are composed by
`apps/web/server/env.ts` and never enter the browser module graph. Web uses
relative same-origin paths for Better Auth and authenticated Admin requests.
Auth cookies are HTTP-only and requests include credentials. Desktop keeps an
optional absolute `VITE_API_URL` for the cloud host.

Local Web defaults `AUTH_URL` to `http://localhost:3000`; the standalone API
defaults it to `http://localhost:3002`. Leave the shared `.env` value blank to
use those host defaults, and set the public origin explicitly in production.

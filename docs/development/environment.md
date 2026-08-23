# Environment

The API requires `DATABASE_URL` and uses Better Auth with `AUTH_SECRET` and
`AUTH_URL`. Admin and API origins are listed in `ALLOWED_ORIGINS`.

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

Browser code may read only explicitly declared `VITE_` values. Web uses
`VITE_API_URL` for Better Auth and authenticated Admin requests. Auth cookies
are HTTP-only and are sent with credentials to the API.

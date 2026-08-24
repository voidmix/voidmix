# @voidmix/mail

## Purpose

Authentication email composition and delivery. The package owns typed templates,
plain-text alternatives, and transport selection for API-owned auth flows.

## Interface

```text
src/env.ts       mail environment preset
src/types.ts     Mailer, template, transport, and message types
src/server.ts    createMailer and server-only template/transport exports
src/templates/   React Email templates and shared layout
src/transports/  Resend and logger transports
scripts/         local deterministic email preview
```

## Ownership

- Own verification, password reset, welcome, and administrator test email content.
- Resolve injected mail configuration for every delivery. Use Resend when
  configured; use logger transport only in development/test.
- Production configuration errors occur at send time as `MailUnavailableError`;
  they never prevent application startup.
- Keep HTML and plain-text output together for every template.

## Constraints

- Never log API keys, passwords, verification tokens, reset URLs, or rendered HTML.
- Do not expose Resend or server environment values to browser applications.
- Do not turn this into an arbitrary marketing-mail API; add a typed method for a
  new product-owned notification.
- Keep templates deterministic and network-free in tests and preview.

## Verification

```bash
bun run --cwd packages/mail check
bun run --cwd packages/mail test
bun run --cwd packages/mail preview:email
```

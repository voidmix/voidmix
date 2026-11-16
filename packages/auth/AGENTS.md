# Auth package guidance

- Keep `/server`, `/client`, `/device`, and `/types` separate. Server construction receives the application-owned database and configuration.
- Keep origin validation enabled. Public device client IDs are identifiers, not secrets; approval always requires the user to verify and confirm the code.
- Device helpers use cookie-independent requests, cancellation/deadlines, server polling intervals, and slow-down handling.
- Device sessions and browser cookie sessions are separate. Tokens and private device codes must not enter URLs or logs.
- Native credential persistence belongs to the consuming application. Revoke redeemed sessions that cannot be committed locally.
- Schema and migrations belong to `@voidmix/db`. Validate changes through API/device E2E and relevant native tests.

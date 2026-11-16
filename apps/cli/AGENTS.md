# CLI guidance

- Keep executable startup in `src/index.ts`, dispatch/help in `src/cli.ts`, command logic in `src/commands`, and configuration in `src/lib`.
- Use the shared oRPC HTTP client; validate arguments and origin/timeout settings before making requests.
- Preserve API URL precedence, explicit request deadlines, and redirect rejection.
- JSON success goes to stdout and structured failures to stderr. Preserve exit codes 0/1/2 for success/operational/usage outcomes.
- Help and version must work without API access. The CLI is one-shot and does not join persistent Turbo dev tasks.
- Keep platform standalone binaries in `build/`, separate from cached JavaScript in `dist/`. Standalone execution uses explicit environment/arguments, not ambient local env/config files.
- Build and run the `cli` E2E project for command behavior changes; check standalone version/help when modifying packaging.

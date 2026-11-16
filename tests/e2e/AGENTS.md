# E2E guidance

- Test production artifacts through browser-visible behavior, real HTTP, or real CLI subprocesses. Read `README.md` and `../../docs/testing.md`.
- Require `E2E_DATABASE_URL`; never fall back to `DATABASE_URL`. Global setup applies migrations and tests create real accounts.
- Keep origins in `environment.ts` aligned with server configuration and compiled Expo public API configuration. Do not reuse development servers.
- Use unique identities/namespaces and clean only test-owned resources. Avoid reliance on test ordering or shared mutable fixtures.
- Preserve SSR checks with JavaScript disabled and desktop checks against static SPA assets.
- The MyGo browser bridge is a simulated fixture. Do not describe it as real native, keyring, or WebView coverage.
- Keep report/trace/screenshot output ignored. Add a project only when its transport/runtime differs enough to justify separate setup.

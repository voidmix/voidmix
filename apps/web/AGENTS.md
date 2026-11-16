# Web guidance

- Web uses TanStack Start SSR. Read `README.md`; keep backend data access behind the independent API.
- File routes belong in `src/routes`, app-specific UI in `src/components`, and server-only configuration/proxy helpers in `src/server`.
- Keep the server-only import guard on upstream helpers. Public browser code must not import database, cache, storage, or auth construction.
- SSR credentials are read for each current request. Pass lazy getters to shared clients; never retain user headers in a process singleton.
- Auth/RPC proxies preserve methods, bodies, origins, cookies, response headers, and redirects. Do not follow auth redirects server-side.
- Keep root document styling and portal stacking isolation. Shared primitives come from `@voidmix/ui`; icons use Hugeicons.
- Regenerate the route tree rather than editing it. Type checking already invokes route generation.
- Verify Web builds, browser SSR tests, and relevant auth/proxy API E2E. Preserve a JavaScript-disabled SSR assertion when changing initial data loading.

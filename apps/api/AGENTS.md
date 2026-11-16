# API guidance

- This is the application composition root for server capabilities. Read `README.md` and `../../docs/architecture.md`.
- Keep Hono assembly in `server.ts`, endpoints in `src/routes`, transport middleware in `src/middleware`, and application-owned clients/configuration in `src/lib`.
- Add RPC schemas to `@voidmix/api/contract` before implementing procedures. Keep selected authorization in procedure middleware; a session being resolved does not imply authorization.
- Request logging must wrap auth, CORS, errors, and not-found responses. Reuse the same request logger in oRPC. Return generic unexpected errors and retain details server-side.
- `src/lib/database.ts` owns the pool. Reuse lazy cache/storage helpers; register resource shutdown in `src/plugins/resources.ts`. Do not create per-request pools.
- Use `requiredEnv` and `envList` for server configuration. An explicit empty list disables origins; an absent value may use development defaults.
- `BETTER_AUTH_URL` addresses public Web pages. Keep auth origin checks enabled and distinct from CORS.
- Build configuration belongs in `vite.config.ts` through Nitro's Vite plugin.
- Validate with root checks, API build, logger tests when middleware changes, and the `api` E2E project against an isolated database.

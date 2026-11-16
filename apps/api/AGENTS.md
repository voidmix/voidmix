# API guidance

- This is the application composition root for server capabilities. Read `README.md` and `../../docs/architecture.md`.
- `server.ts` connects `src/runtime.ts` to `createApp` in `src/app.ts`. Keep endpoints in `src/routes` and transport middleware in `src/middleware`.
- Only `server.ts` and Nitro lifecycle plugins may import `src/runtime.ts`. Pass narrow dependencies into routes and middleware; importing `src/app.ts` must not read environment variables, initialize logging, or construct backend clients. `check:workspace` guards direct runtime imports.
- Pass the resource owner as `createApp`'s `services` option; procedures borrow `database`, `getCache()`, and `getStorage()` through `context.services` (`ApiServices`). Keep the database getter intact rather than copying its value. `createRpcMiddleware(services, router?)` owns a handler per app; the optional `rpcRouter` app option supports context tests without extending the public contract.
- Add RPC schemas to `@voidmix/api/contract` before implementing procedures. Keep selected authorization in procedure middleware; a session being resolved does not imply authorization.
- `/health` is liveness and must never contact a backend. `/ready` gates only on PostgreSQL; optional capabilities are reported, not required, and causes stay out of the response.
- Request logging must wrap auth, CORS, errors, and not-found responses. Reuse the same request logger in oRPC. Return generic unexpected errors and retain details server-side.
- `createApiResources` in `src/resources.ts` owns the pool, auth instance, and lazy cache/storage handles. Add cleanup there; the Nitro plugin delegates to its shared, idempotent `close()`. All disposers must run even if another fails. Never create handles after shutdown starts. The database getter and both optional accessors must fail during and after shutdown; previously borrowed handles follow client shutdown semantics.
- Add server settings to the pure `loadApiConfig(env)` function in `src/config.ts`. An explicit empty CORS list disables origins; an absent value may use development defaults. Enabled S3 requires complete settings at startup.
- `BETTER_AUTH_URL` addresses public Web pages. Keep auth origin checks enabled and distinct from CORS.
- Build configuration belongs in `vite.config.ts` through Nitro's Vite plugin.
- `bun run test:api` tests the HTTP factory, application logging, configuration, and resource ownership without live services. Shared logger tests must not import application adapters. Also validate with root checks, API build, and the `api` E2E project against an isolated database.

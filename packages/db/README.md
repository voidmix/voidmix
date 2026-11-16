# @voidmix/db

PostgreSQL with Drizzle ORM 0.45 and the `pg` driver. Shared factories do not load environment variables or connect on import. Applications own pool creation and shutdown.

## Local development

```sh
bun run env:init
bun run db:up
bun run db:migrate
```

The local Compose service uses PostgreSQL 17 on `127.0.0.1:5432`, with development user/password/database `voidmix`. `db:down` stops it and retains the named volume. For an external server, set `DATABASE_URL` instead.

## Public exports and lifetime

```ts
import { createDatabase } from "@voidmix/db/client"
import { user } from "@voidmix/db/schema"

const { db, pool } = createDatabase(connectionString)
try {
  const users = await db.select().from(user)
} finally {
  await pool.end()
}
```

`createDatabase` returns a lazy Drizzle database and its pool. The default maximum is ten connections **per process**, with five-second connection and thirty-second idle timeouts. Long-lived servers reuse the pool. The API owns it in `apps/api/src/lib/database.ts` and closes it through Nitro's resource plugin. One-shot scripts close it in `finally`.

`@voidmix/db/migrate` exports `migrateDatabase(connectionString)`, which uses a single-connection pool, resolves SQL relative to its module, and always closes the pool.

## Schema and migrations

`src/schema/auth.ts` and `device.ts`, re-exported by `schema/index.ts`, define `auth_user`, `auth_session`, `auth_account`, `auth_verification`, and `auth_device_code`. Authentication identities and tokens have uniqueness constraints; user references cascade on deletion. Foreign keys and verification identifiers are indexed. Device and public user codes have separate unique constraints. Timestamps include time zones.

```sh
# After changing schema; generation does not connect to the database.
bun run db:generate --name=describe_change
# Review SQL and metadata before applying to the explicitly configured target.
bun run db:migrate
bun run db:check
```

Commit SQL, journal, and snapshots together. Preserve applied migration history and add a new migration for subsequent changes. Application startup does not run migrations; deployment runs the migration job first. Configure production connection/TLS settings at runtime.

E2E migrates only the explicit `E2E_DATABASE_URL`; it never falls back to the development URL. See [testing](../../docs/testing.md).

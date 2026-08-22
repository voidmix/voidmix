# @voidmix/db

## Purpose

The database adapter. It hides Drizzle and PostgreSQL behind the repository
interfaces owned by `@voidmix/domain`.

## Interface

| Path       | Purpose                                                         |
| ---------- | --------------------------------------------------------------- |
| `.`        | repositories, connection helpers, `migrateDatabase`, re-exports |
| `./env`    | the database environment preset                                 |
| `./schema` | Drizzle tables, enums, and the `schema` aggregate               |

Source layout: `src/schema.ts` (one flat file, no `src/schema/`),
`src/postgres.ts`, `src/memory.ts`, `src/env.ts`, `src/index.ts`, and SQL output
under `drizzle/`.

## Ownership

- Own the Drizzle schema, `PostgresUserRepository` (production),
  `InMemoryUserRepository` (development and test), and migration execution.
- Own no business rule and no interface definition — both belong to
  `@voidmix/domain`.

## Constraints

- Never expose tables or Drizzle types to frontend applications. Web, Admin, and
  Desktop reach the backend through `@voidmix/client` and `@voidmix/contracts`.
- **Both repositories must be updated together** when `UserRepository` changes,
  or `implements UserRepository` fails.
- `InMemoryUserRepository` must **clone on read and on write**
  (`{ ...user }`, `{ ...event, metadata: { ...event.metadata } }`) so tests
  cannot mutate stored state.
- Schema idioms: enums first with the `Enum` suffix and a snake_case PostgreSQL
  name; the third `pgTable` argument is the **array** form (Drizzle 1.0 RC),
  not the legacy object form; index names are `<table>_<cols>_idx`; camelCase
  TS keys map to explicit snake_case columns; timestamps are always
  `{ withTimezone: true, mode: "date" }` so native `Date` survives end to end.
- A new table must be registered **twice**: in the `schema` aggregate at the
  bottom of `src/schema.ts`, and in the named re-export barrel `src/index.ts`.
- Keep application relations in the single `defineRelations(schema, ...)`
  export. For multiple foreign keys between the same tables, use explicit
  aliases; audit events use `actor` and `target`.
- **Never hand-edit `drizzle/*.sql` or `drizzle/meta/`.** Generate them. The
  journal's `idx` does not match the filename number, so do not invent names.
- `drizzle.config.ts` calls `getDatabaseEnv()` at module load, so `drizzle-kit`
  fails at import time when `DATABASE_URL` is missing or invalid.
- `db seed` and `db studio` are restricted to development and test by
  `@voidmix/scripts`; `db migrate` only requires a database URL.
- A new audit-action value is also declared in `@voidmix/domain` (literal union)
  and `@voidmix/contracts` (`z.enum`). All three plus a migration must land
  together.

## Verification

```bash
bun run --cwd packages/db check
bun run --cwd packages/db test
bun run --cwd packages/db generate   # or repo-wide: bun run generate
bun run db:migrate
```

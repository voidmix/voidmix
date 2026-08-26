# @voidmix/db

## Purpose

The database adapter. It hides Drizzle and PostgreSQL behind the repository
interfaces owned by `@voidmix/core`.

## Interface

| Path       | Purpose                                                     |
| ---------- | ----------------------------------------------------------- |
| `.`        | repositories, connection helpers, migrate/reset, re-exports |
| `./env`    | the database environment preset                             |
| `./schema` | Drizzle tables, enums, and the `schema` aggregate           |

Source layout: `src/schema.ts` (one flat file, no `src/schema/`),
`src/postgres.ts`, `src/memory.ts`, `src/env.ts`, `src/index.ts`, and SQL output
under `drizzle/`.

## Ownership

- Own the Drizzle schema, user and system-settings repositories in PostgreSQL
  and memory, and migration execution.
- Own no business rule and no interface definition — both belong to
  `@voidmix/core`.

## Constraints

- Never expose tables or Drizzle types to frontend applications. Web (including
  its Admin routes) and Desktop reach the backend through `@voidmix/client` and
  `@voidmix/contracts`.
- PostgreSQL and in-memory implementations must be updated together when a
  domain repository interface changes.
- Auth policy reuses `system_settings` with the fixed keys
  `auth.registration_mode`, `auth.allowed_email_domains`,
  `mail.welcome_enabled`, `mail.verification_enabled`, and
  `mail.password_reset_enabled`; it never exposes an arbitrary key/value API.
- Auth policy updates and their redacted `system.settings.updated` audit event
  are one transaction in PostgreSQL. A no-op update must not append an audit
  event.
- Mail and Auth mutations are partial. Omitted fields are untouched, `set` or
  `replace` upserts one fixed key, and `reset` deletes that key so resolution
  falls back to environment/default state. An absent reset is a no-op.
- Settings audit metadata contains only changed field names, mutation operations,
  and the result. Never include domain lists, effective policy values, or secret
  material.
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
  aliases; audit events use `actor` and nullable `targetUser`.
- **Never hand-edit generated migrations.** Each lives in its own
  `drizzle/<timestamp>_<name>/` with `migration.sql` and `snapshot.json`
  (Drizzle 1.0 RC; there is no `_journal.json`). Regenerate instead, and do not
  invent directory names.
- `generate` exits 2 with `missing_hints` when a diff is ambiguous — it cannot
  tell a rename from a create. Re-run with the `--hints '<json-array>'` it
  prints; `bun run generate` and `db push` forward flags for exactly this.
- A foreign key on a **generated** column (`audit_events.target_user_id`) may
  only use `restrict`/`no action`. PostgreSQL rejects any action that would have
  to write the column, so `onUpdate: "cascade"` fails at migrate time, not at
  generate time.
- `drizzle.config.ts` calls `getDatabaseEnv()` at module load, so `drizzle-kit`
  fails at import time when `DATABASE_URL` is missing or invalid.
- `db seed`, `db push`, `db clean`, and `db studio` are restricted to
  development and test by `@voidmix/scripts`; `db migrate` only requires a
  database URL.
- `db push` applies the schema without a migration, so it is for a database in
  flux only. Committed schema changes still ship as generated `drizzle/*.sql`.
  It forwards its flags to `drizzle-kit`, because an ambiguous diff exits 2 and
  demands `--hints '<json-array>'`.
- `resetDatabase` (`db clean`) drops the `drizzle` and `public` schemas and
  recreates an empty `public`. It destroys data and migration history without
  prompting, so the environment guard is the only protection.
- A new audit-action value is also declared in `@voidmix/core` (literal union)
  and `@voidmix/contracts` (`z.enum`). All three plus a migration must land
  together.

## Verification

```bash
bun run --cwd packages/db check
bun run --cwd packages/db test
bun run --cwd packages/db generate   # or repo-wide: bun run generate
bun run db:migrate
```

# Getting Started

## Requirements

- Bun `1.4.0`
- Node.js `24.18.0`
- Rust/Cargo for Desktop development and packaging
- PostgreSQL when persistent data is required

Versions are pinned in the root repository configuration. Prefer repository
scripts over globally installed tooling.

## Setup

```bash
cp .env.example .env
bun install
bun run generate
bun run dev
```

Without `DATABASE_URL`, the API starts with an in-memory repository. Use
`VOIDMIX_ACTOR_ID=owner-local` or the `x-voidmix-user-id` request header to
select the local development actor.

## Environment files

The root `.env.example` is the only committed complete example. Put shared
local values in root `.env` and machine-specific overrides in root
`.env.local`. Env-sensitive development and build scripts use:

```bash
vmx env -- <command>
```

The runner resolves the repository root from `@voidmix/scripts`, so it behaves
the same from the repository root or a workspace directory. It loads
`.env.local` before `.env`, while Dotenvx preserves values already provided by
the calling shell. The resulting priority is:

```text
process.env > .env.local > .env > schema defaults
```

Workspaces decide which scripts need file-backed environment values. Web,
Admin, API, and Desktop use the runner for development and builds; database
and deployment-oriented repository commands use it as needed. Unit tests stay
outside the runner and must provide `runtimeEnv` or test stubs explicitly
rather than depend on values from a developer's files.

Dotenvx only loads files. `@voidmix/env` still owns schema composition,
defaults, normalization, and validation. Unknown variables are ignored.

## Common commands

```bash
bun run dev
bun run doctor
bun run clean
bun run deps:check
bun run deps:update
bun run deps:dedupe:check
bun run deps:audit
bun run skills:update
bun run check
bun run test
bun run build
bun run db:migrate
bun run db:seed
bun run db:studio
bun run admin:create -- --email owner@example.com --name "Workspace Owner"
bun run desktop:build
bun run verify
```

Those names are aliases for nested `vmx` commands, which is what the scripts call.
Reach for the CLI directly when you need to pass an argument:

```bash
bun run vmx db migrate
bun run vmx db seed
bun run vmx db studio
bun run vmx admin create --email owner@example.com --name "Workspace Owner"
bun run vmx desktop build
```

## Local PostgreSQL

```bash
docker compose up -d postgres
bun run db:migrate
bun run db:seed
bun run db:studio
```

## Application ports

```text
Web      http://localhost:3000
Admin    http://localhost:3001
API      http://localhost:3002
Desktop  Vite dev server on port 1420 when launched through Tauri
```

See [Runtime and deployment](../architecture/deployment.md) for production
boundaries and [Testing](./testing.md) before submitting changes.

# @voidmix/scripts

## Purpose

The private repository CLI. Vite+ owns the task graph; this package owns
procedural operations that understand the repository or the database. It exposes
the `vmx` bin.

## Interface

```text
src/cli.ts          bin entry; routes `env -- <cmd>` before the citty tree
src/root.ts         citty command registry
src/commands/       thin adapters: clean, env, generate, desktop, verify, shadcn
src/runtime/        action boundary, context, env, logger, process, repository
src/database/       command, operation, policy, PostgreSQL user adapter
src/admin/          command and administrator operation
src/doctor/         command, checks, runtime probes, report rendering
src/deps/           Bun dependency maintenance commands and operations
src/skills/         repository skill maintenance commands and operations
src/policy/         command, orchestration, checks/<rule-domain>, manifest rules,
                    fixes, per-convention pure modules, report
src/verify/         Nitro runtime verification
```

Commands: `env -- <command>`, `doctor`, `deps check|update|dedupe|audit`, `skills update`, `clean`, `db migrate|seed|studio`,
`admin create`, `generate`, `desktop build`, `policy`, `verify`,
`shadcn update`.

## Ownership

- Own repository and database automation, environment file loading for
  development and build commands, and diagnostic reporting.
- Own no product behaviour and no task ordering.

## Constraints

- **Runtime applications must never import this package.** It is tooling.
- Citty modules stay thin adapters. The house shape, which new modules must
  follow, is: a **pure check or operation function taking injected dependencies**
  (`doctor/checks.ts`), a **separate renderer** (`doctor/report.ts`), a
  **separate dependency factory** (`doctor/runtime.ts`), and a short command
  adapter (`doctor/command.ts`). This is what makes the logic testable without
  PostgreSQL, subprocesses, or optional tools.
- Every command declares a `process`, `repository`, or `database` environment
  policy, and the shared contextual action creates that context and registers its
  logger before invoking the operation.
- Commands must support non-interactive CI execution, explicit exit codes, and
  structured logging via `@voidmix/logger`.
- **Destructive database operations are restricted to development and test.**
  `database/policy.ts` owns that gate; do not bypass it.
- `vmx env -- <command>` uses the Dotenvx programming API directly, loads
  `.env.local` then `.env` without overriding inherited values, never mutates
  global `process.env`, and must not recursively wrap another `vmx` process.
  Tests are intentionally not wrapped.
- Use domain directories for naming context (`database/policy.ts`,
  `doctor/checks.ts`) instead of repeating prefixes in filenames.
- `policy/checks.ts` only orchestrates injected rule domains. Workspace, docs,
  skills, TypeScript, and manifest checks live under `policy/checks/`; manifest
  script/dependency rules live under `policy/manifests/`. Preserve the public
  `runPolicy` and manifest-rule interfaces when splitting internals.
- Dependency maintenance is explicit: `vmx deps dedupe` may rewrite `bun.lock`,
  `vmx deps dedupe --check` is read-only, and `vmx deps audit` is read-only.
- Never print secret values loaded by the env runner.

## Verification

```bash
bun run --cwd packages/scripts check
bun run --cwd packages/scripts test
bun run doctor
```

# @voidmix/scripts

Internal Bun tooling for environment initialization, toolchain diagnostics, services, deployment, and workspace validation. `src/index.ts` dispatches commands, `src/commands` owns tasks, and `src/lib` holds process/path helpers. Commands resolve this repository from their module location, not the caller's working directory.

## Commands

```sh
bun run repo --help
bun run env:init
bun run doctor
bun run check:workspace
bun run services:up
bun run services:status
bun run services:down
bun run docker:init
bun run docker:up
bun run docker:status
bun run docker:logs
bun run docker:backup
bun run docker:down
```

Root shortcuts forward to `bun run repo <command>`. Initialization, service, and deployment commands accept `--dry-run`; use `--dry-run --json` for machine-readable command plans. Actual service/deployment operations inherit child output, so their `--json` mode requires preview.

## Configuration and diagnostics

`env:init` copies `.env.example` and generates a 32-byte random auth secret. `docker:init` creates `deploy/.env` with independent auth, PostgreSQL, Redis, and S3 secrets. Existing files are preserved, concurrent writers use exclusive creation, and POSIX permissions are `0600`. Reports contain paths/status, not secrets. Existing files need manual additions when templates gain fields.

`doctor` checks Bun, a real Node installation, Go, Compose, and the Docker daemon. Versions come from root engines and the Go module. It skips Bun's Node-compatible shim when looking for Node. External probes time out after five seconds.

By default it also validates required auth/PostgreSQL settings and enabled Redis/S3 configuration, reading root `.env` with process variables taking precedence. It does not connect to those backends. `--tools-only` is useful before environment initialization; `--json` provides structured diagnostics.

## Workspace checks

`bun run check:workspace` invokes `repo check`, also included in root `check`. It reads workspace manifests and TypeScript/JavaScript imports to verify:

- Each workspace has a README and unique name.
- Local dependencies exist and use `workspace:*`.
- Imported packages are declared and workspace subpaths are public exports.
- Production relative imports stay inside their workspace; integration tests may exercise real adapters.
- Shared packages and applications do not depend on other applications; E2E may depend on app artifacts.
- Browser-facing modules do not directly import server infrastructure or auth construction.
- Runtime workspace dependencies are acyclic, and root dependency constraints use `resolutions`.
- Only the API server entry and lifecycle plugins import its process runtime; HTTP modules receive dependencies explicitly.

The checker is read-only and needs the installed TypeScript dependency. It is loaded lazily so bootstrap commands such as `docker:init` and deployment management continue to run before `bun install`. The check is structural: it does not prove arbitrary dynamic imports or complete bundle security.

## Services and deployment

`services:up` starts PostgreSQL, Redis, and RustFS through `compose.yaml`, waits for health, then initializes the local bucket. `services:down` uses `stop`, retaining containers and volumes. Migrations are separate and explicit.

Deployment commands use `compose.deploy.yaml` and `deploy/.env`. `docker:up` builds four targets and waits for migration/storage initialization and health. `docker:down` stops services and retains data. `docker:backup` runs the one-shot `backup` profile, which writes a PostgreSQL dump to `BACKUP_DIR`. See [deployment](../../deploy/README.md).

## Reusable helpers and verification

```ts
import { runCommand, probeCommand } from "@voidmix/scripts/process"
import { workspaceRoot } from "@voidmix/scripts/workspace"

await runCommand([process.execPath, "run", "check"], { cwd: workspaceRoot })
const result = await probeCommand(["go", "version"], { timeout: 5000 })
```

Arguments are passed as argv, without a shell. `runCommand` inherits streams and throws `CommandError` with the child's exit code. `probeCommand` captures output and kills timed-out probes. Usage errors return 2, ordinary errors return 1, and child failures retain their exit code. Bun itself may print script invocations to stderr.

Add tasks in `src/commands` and register help/dispatch in the entry point; add root shortcuts for frequent tasks. Tests use temporary directories and real subprocesses, including negative fixtures for workspace violations.

```sh
bun run test:scripts
bun run check
```

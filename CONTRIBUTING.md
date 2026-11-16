# Contributing

## Find the owner first

Read [architecture](docs/architecture.md), the target workspace README, and the applicable `AGENTS.md`. Applications assemble dependencies; shared packages provide reusable behavior through explicit exports. Put a feature in the existing owner before introducing a new package.

Typical changes:

| Change                  | Files to start with                                   | Verification                                       |
| ----------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| HTTP/RPC behavior       | `packages/api/src/contract.ts`, `apps/api/src/routes` | API build and `api` E2E project                    |
| Web page                | `apps/web/src/routes`, app-local components           | Web build and browser E2E projects                 |
| Native desktop behavior | `apps/desktop/*.go`, generated bindings               | `test:go`, frontend build, native package          |
| Mobile behavior         | `apps/mobile/src/app`, `src/lib`                      | `check:mobile`, build, `expo-web`, native device   |
| Database change         | `packages/db/src/schema`, generated migration         | Review SQL, `db:check`, isolated database tests    |
| Shared web component    | `packages/ui/src/components` and theme                | Type checking, Web/desktop builds, keyboard checks |
| Repository tooling      | `packages/scripts/src/commands`                       | `test:scripts`, command preview, `check:workspace` |

## Development loop

```sh
bun install --frozen-lockfile
bun run check:workspace
# Make a focused change, then format it.
bun run format
bun run format:go          # When Go files change
bun run check
bun run build
```

Run the tests appropriate to the changed behavior; see [testing](docs/testing.md). Build and check commands do not require a live database. Server startup requires the authentication environment configuration. Test commands use explicitly named test services and never fall back to development credentials.

## Code and comments

Use strict TypeScript, double quotes, no semicolons, and Oxfmt formatting. Use `gofmt` for Go. Prefer named public subpaths over broad barrel exports. Framework middleware belongs next to its transport adapter; application configuration and resource ownership stay at the application entry point.

Write documentation and comments in English. Preserve the current user-facing language unless a product change calls for translation. Comments should explain invariants, ordering, ownership, recovery, or compatibility workarounds. Document public helpers with resource lifetime and error semantics when those details are not obvious from their types. Update nearby comments when behavior changes.

Keep secrets out of source, logs, test artifacts, and examples. The `.env.example` files contain documented development defaults or empty secrets. `env:init` creates a protected local file without replacing an existing one.

## Dependencies and generated files

Declare every imported dependency in the consuming workspace, even with hoisted installation. Use `workspace:*` for local dependencies and exported subpaths for cross-workspace imports. `check:workspace` enforces these rules, detects runtime cycles, and checks direct server imports in browser-facing modules. It is a structural check, not a full bundle-security analysis.

Use root `resolutions` for intentional global constraints. Keep Expo's React family, MyGo's Go module/CLI/runtime, and oRPC's contract/client/server compatible. Some transitive tools legitimately need their own dependency versions; review global overrides carefully.

Regenerate route trees with the workspace `generate-routes` command and MyGo bindings with `bun run --cwd apps/desktop generate`. Commit generated source changes; do not edit them by hand. Build output, native generated projects, test reports, and local environment files remain ignored.

For schema changes, generate a new Drizzle migration and review its SQL and metadata together. Preserve applied migration history. Target the intended database explicitly before applying migrations.

## Documentation ownership

Keep the root README as a navigation and onboarding page. Put local setup and usage in the owning workspace README. Keep cross-application flows in `docs/architecture.md`, environment ownership in `docs/configuration.md`, and test setup in `docs/testing.md`. Update command examples, environment templates, and agent guidance in the same change when their contract changes.

All workspaces are currently private; there is no public package publishing workflow. Add release/versioning machinery when there is an actual independently released artifact that needs it.

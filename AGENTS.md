# Repository guidance

## Read and orient

- Start with `README.md`, `docs/architecture.md`, and the target workspace README. Read narrower `AGENTS.md` files before editing their directories.
- This is a Bun/Turbo monorepo. Applications live in `apps/*`, reusable source packages in `packages/*`, and production E2E in `tests/e2e`.
- Keep the chosen stack: TanStack Start Web SSR, Nitro/Hono/oRPC API, MyGo/Go desktop SPA, Expo mobile, Base UI/shadcn and Hugeicons. Extend existing owners before introducing new packages.

## Editing conventions

- Preserve unrelated working-tree changes and staging. Do not commit or reset work unless requested.
- Use `bun run` from the repository root. Runtime and shell selection belong to `bunfig.toml`; do not add `bun --bun` to commands.
- Use English for documentation and code comments. Preserve existing product language unless the task changes it.
- Use Oxfmt for TypeScript/JSON/Markdown and `gofmt` for Go. Explain ownership, ordering, security invariants, failure recovery, and compatibility workarounds in comments; avoid restating obvious syntax.
- Shared packages expose explicit `package.json` subpaths. Declare imported dependencies locally, use `workspace:*` internally, and avoid relative imports across workspace source directories.
- Applications assemble capabilities; packages do not depend on applications. Integration tests may exercise real app adapters. Keep runtime workspace dependencies acyclic.
- React/React DOM and their types are constrained by root `resolutions` to match Expo. Keep MyGo's Go module, CLI, and runtime versions compatible.

## Runtime and data

- Backend factories accept configuration; apps own environment loading, process singletons, and cleanup. Do not open infrastructure connections in browser code or create a pool per request.
- Never put secrets in public client environment variables, logs, committed examples, generated assets, or redirect URLs.
- Use an explicit target for database operations. Tests use separate `E2E_DATABASE_URL`, `TEST_REDIS_URL`, and `TEST_S3_*`; never fall back to runtime data.
- Preserve applied SQL migration history. Commit new SQL with its Drizzle journal and snapshot.
- Scope cleanup to resources created by the task. Local service stop commands retain volumes.

## Verification

- `bun run check` runs lint, formatting, structural dependency checks, TypeScript generation/checking, and Go vet.
- `bun run test:scripts`, `test:logger`, and `test:go` exercise tooling, logs, and native auth without external data services.
- `bun run build` builds all application assets. Use workspace filters for a narrow iteration loop.
- `bun run check:mobile` verifies Expo compatibility. Infrastructure tests and project-specific E2E setup are documented in `docs/testing.md`.
- Run checks appropriate to changed behavior. Clearly distinguish browser/simulated native checks from real WebView/device verification.

## Generated files and documentation

- Do not hand-edit `routeTree.gen.ts` or `mygo.gen.ts`; regenerate and retain their committed changes.
- Do not edit build output, ignored native projects, test reports, or local environment files as source.
- Keep the root README short. Put owner-specific workflows in workspace READMEs; cross-app architecture, configuration, and testing belong in `docs/`.
- Update examples, relevant Turbo environment lists, comments, and scoped guidance when changing their contract.

# CLI application

A Bun CLI using `node:util.parseArgs` and the shared oRPC HTTP client. `src/index.ts` is the executable entry, `src/cli.ts` dispatches commands, `src/commands` implements them, and `src/lib` owns configuration.

## Usage

```sh
bun run cli --help
bun run cli --version
bun run cli health
bun run cli greet "Voidmix CLI" --json
bun run cli health --api-url https://api.example.com --timeout 10000
```

`health` requests `/health`; `greet <name>` calls `/api/rpc/greet`. A trimmed name must contain 1–80 characters. Start the API or point to a deployed instance. Help and version do not require a running API.

API base URL precedence: `--api-url`, `VOIDMIX_API_URL`, then `http://127.0.0.1:3002`. Use a base URL without `/api/rpc`; gateway path prefixes are supported. Set the variable in the process or the appropriate `.env` when running source commands.

The timeout is an integer from 1 to 120000 milliseconds, defaulting to 5000. Both health and RPC abort on deadline and do not follow redirects. Validate inputs before making requests.

`--json` writes success results to stdout and `{ "error": "..." }` to stderr. Exit codes: 0 for success, 1 for network/service/response failures, 2 for command or argument errors. Bun script runner messages also use stderr; run the built entry directly for a clean executable interface.

## Builds

```sh
bun run build:cli
bun apps/cli/dist/voidmix.js health --json
bun run build:cli:binary
./apps/cli/build/voidmix --help
```

The JavaScript bundle includes dependencies and a source map and requires Bun 1.4.4+. `bin.voidmix` points to `dist/voidmix.js`. Root `build` includes this bundle.

The standalone executable embeds Bun and lives in ignored `build/` (`voidmix.exe` on Windows). It reads explicit process environment and arguments rather than automatically loading the current directory's `.env` or `bunfig.toml`. Platform binaries are kept separate from Turbo's JavaScript output cache.

## Extension and verification

Add commands in `src/commands`, register them and their help in `src/cli.ts`, and preserve structured output and exit semantics. This is a one-shot application, not a persistent `dev` task.

```sh
E2E_DATABASE_URL=postgresql://.../voidmix_e2e bun run test:e2e -- --project=cli
```

The test project executes the built CLI against the real API, covering health, RPC, origin precedence, JSON, errors, and timeouts. CI also builds the Linux standalone binary and checks its version output.

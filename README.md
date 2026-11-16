# Voidmix

A Bun and Turborepo monorepo with five application entry points and source-based shared packages.

| Application | Runtime and responsibility                                               | Guide                             |
| ----------- | ------------------------------------------------------------------------ | --------------------------------- |
| Web         | TanStack Start SSR, same-origin API proxy, login and authorization pages | [Web](apps/web/README.md)         |
| API         | Nitro + Hono + oRPC on Bun; authentication and infrastructure ownership  | [API](apps/api/README.md)         |
| Desktop     | MyGo + Go, with a TanStack Start SPA embedded as static assets           | [Desktop](apps/desktop/README.md) |
| Mobile      | Expo SDK 58 + React Native + Expo Router                                 | [Mobile](apps/mobile/README.md)   |
| CLI         | Bun command-line client, also built as a standalone executable           | [CLI](apps/cli/README.md)         |

Web and desktop share shadcn Base UI components, Tailwind CSS 4, and Hugeicons. Mobile uses React Native components and shares the HTTP contract and device authorization helpers.

## Quick start

Use Bun 1.4.4, Node.js 24 for tool compatibility, Go 1.27.3+, and Docker Compose v2. The exact Bun version is recorded in `packageManager`; `bun run doctor --tools-only` checks the toolchain. Project commands use Bun through `bunfig.toml`.

```sh
bun install --frozen-lockfile
bun run env:init
# Edit .env if using external infrastructure.
bun run services:up
bun run db:migrate
bun run doctor
bun run dev:web
```

Web runs at <http://localhost:3000>; API runs at <http://127.0.0.1:3002>. Environment initialization preserves existing files and generates a random authentication secret. Local PostgreSQL and S3 data use named volumes. `services:down` stops the local infrastructure and retains its data.

```sh
bun run dev:desktop      # MyGo window, Web, and API
bun run dev:desktop:web  # Desktop browser preview only
bun run dev:mobile       # Metro, Web, and API; reachable from the local network
bun run cli --help
```

Desktop requires WKWebView on macOS, WebView2 on Windows, or GTK 3 and WebKitGTK 4.1 on Linux. Its shared web UI targets modern browsers, including Safari 16.4+. Native mobile login requires a development build with the `voidmix` URL scheme; Expo Go is sufficient for ordinary page previews.

## Repository map

```text
apps/                  Deployable applications and their composition roots
packages/              Reusable code exposed through package.json exports
  api/                 oRPC contract, validation, and HTTP client
  auth/                Better Auth factories and device authorization helpers
  db/                  PostgreSQL pools, Drizzle schema, and migrations
  cache/               Redis connections and JSON cache helpers
  storage/             Scoped unstorage/S3 handles
  logger/              evlog configuration and framework adapters
  ui/                  Shared React components, icons, and theme
  scripts/             Repository commands and maintenance checks
  typescript-config/   Shared strict compiler configuration
tests/e2e/             Production browser, HTTP, and CLI tests
docs/                  Architecture, configuration, operations, and verification guides
deploy/                Docker Compose deployment, reverse proxy, and backups
infra/                 Kubernetes manifests for clusters with managed data services
```

Start with [architecture](docs/architecture.md) when choosing where code belongs, [configuration](docs/configuration.md) when connecting applications, [adding a feature](docs/adding-a-feature.md) for the path through the workspaces, [operations](docs/operations.md) when running a deployment, and [contributing](CONTRIBUTING.md) when making changes. The [decision log](docs/decisions.md) records why the main constraints exist. Every workspace has a README; scoped `AGENTS.md` files capture the same local constraints for coding agents.

## Common commands

| Command                   | Purpose                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `bun run repo --help`     | Repository command reference                                |
| `bun run check`           | Lint, formatting, workspace structure, types, and Go vet    |
| `bun run check:workspace` | Check dependency declarations, public imports, and layering |
| `bun run build`           | Build all application assets and the JavaScript CLI         |
| `bun run start`           | Start the built API and Web services                        |
| `bun run check:mobile`    | Check Expo SDK compatibility                                |
| `bun run test:scripts`    | Test maintenance tooling                                    |
| `bun run test:logger`     | Test logging, redaction, and request isolation              |
| `bun run test:api`        | Test API composition, authorization, config, and shutdown   |
| `bun run test:go`         | Test native authentication with the Go race detector        |
| `bun run test:e2e`        | Build and test all production application entry points      |
| `bun run ui:add tooltip`  | Add a shared Base UI component                              |

Service-specific commands live in the corresponding workspace guide. [Testing](docs/testing.md) documents infrastructure-backed tests, project filters, and native verification limits.

## Deployment

```sh
bun run docker:init
# Set deploy/.env BETTER_AUTH_URL to the public HTTPS Web origin.
bun run docker:up
bun run docker:status
```

The deployment includes Web, API, PostgreSQL, Redis, S3, and one-shot migration/bucket initialization jobs. It uses separate configuration and volumes from local development. Runtime images contain Bun and built artifacts; the host needs neither Node.js nor Go. See [Docker deployment](deploy/README.md) for networking, the optional HTTPS proxy, and backups, and [Kubernetes deployment](infra/README.md) for clusters with managed PostgreSQL, Redis, and S3.

## Dependency policy

Run installation from the repository root and commit `bun.lock`. Internal dependencies use `workspace:*`; consumers import public package subpaths. Root `resolutions` keep React, React DOM, and their types aligned with Expo. Upgrade those versions together and run `check:mobile`.

Shared packages export source and are compiled by their consumers. Generated TanStack route trees and MyGo bindings are committed but regenerated by tools. See [contributing](CONTRIBUTING.md) for the maintenance workflow and narrowly scoped validation commands.

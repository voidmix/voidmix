# Voidmix Documentation

This directory is the source of truth for architecture, development workflows,
deployment boundaries, and coding-agent guidance.

## Architecture

- [Architecture overview](./architecture/README.md) — system shape, workspace
  map, dependency direction, and design rules.
- [Domain glossary](../CONTEXT.md) — shared terms for workspaces, projects,
  assets, sync, Agent runs, and boundary layers.
- [Applications](./architecture/applications.md) — Web (including Admin), Desktop, API,
  and Storybook: what each is for, how it is built, and how it is deployed.
- [Shared packages](./architecture/packages.md) — contracts, client, domain,
  auth, i18n, mail, env, DB, logger, UI, scripts, and TypeScript presets.
- [Product design](./architecture/design.md) — brand posture, cross-surface
  intensity, visual vocabulary, and accessibility rules.
- [Project Studio migration](./architecture/project-studio.md) — approved
  project-first product direction, current implementation audit, migration
  sequence, compatibility, and acceptance criteria.
- [Toolchain](./architecture/tooling.md) — Bun catalogs, Vite+, TypeScript,
  shadcn/Base UI, and repository automation.
- [Runtime and deployment](./architecture/deployment.md) — production runtimes,
  containers, Railway, PostgreSQL, and Tauri distribution.
- [Decision records](./architecture/decisions/README.md) — decisions that
  constrain future work, and the conditions for revisiting them.
- [Internationalization decisions](./architecture/decisions/0004-use-intl-static-catalogs.md)
  — the `@voidmix/i18n` facade, `en`/`zh` catalogs, Web loading, and recipient
  locale behavior.

## Development

- [Getting started](./development/getting-started.md) — requirements, setup,
  local services, and common commands.
- [Environment](./development/environment.md) — API, Better Auth, and mail
  environment boundaries.
- [Testing and verification](./development/testing.md) — workspace checks, CI
  expectations, and the Vite+/Vitest plugin boundary.
- [Web bundle baseline](./development/web-bundle.md) — how to compare the home
  route's initial client preloads and deferred interaction chunks.
- [Workspace preview](./development/workspace-preview.md) — Clean Signal routes,
  preview data boundaries, project interactions, Pi states, and verification.
- [File structure](./development/file-structure.md) — where a new file goes
  inside a workspace, and the conventions policy enforces.
- [Coding agents](./development/agents.md) — read order, default decisions,
  verification checklist, and skill governance for Codex and Claude Code.

Repository-level product and visual context also lives in
[PRODUCT.md](../PRODUCT.md) and [DESIGN.md](../DESIGN.md).

# @voidmix/ai

## Purpose

The server-side AI adapter. It owns Pi SDK integration, provider lifecycle,
tool registration, and conversion to Voidmix-owned run events.

## Interface

`src/index.ts` exports `AiProvider`, `AiToolRegistry`, `AiRunEvent`,
`createPiProvider`, `createFakeProvider`, and project tool registration.

## Ownership

This package owns Pi SDK integration and provider lifecycle. It does not own
HTTP transport, authentication, database connections, domain rules, or UI.

## Constraints

- Depend on domain interfaces, never on Drizzle, Hono, oRPC, React, or Web.
- Never read request sessions or create database connections.
- Keep provider and SDK types behind this package's small public interface.
- Tools receive explicit authenticated project context and dependencies.
- Never log prompts, credentials, tokens, or private project content.

## Verification

```bash
bun run --cwd packages/ai check
bun run --cwd packages/ai test
```

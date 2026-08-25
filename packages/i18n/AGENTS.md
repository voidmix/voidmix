# @voidmix/i18n

## Purpose

Shared locale negotiation, React runtime helpers, Intl formatting, and the
Paraglide/Inlang build adapter used by application-owned catalogs.

## Interface

```text
@voidmix/i18n         locale constants, parsing, formatting, translation
@voidmix/i18n/client  React provider/hooks and browser/Desktop storage
@voidmix/i18n/server  request and configured-locale resolution
@voidmix/i18n/build   Paraglide generation and Vite integration
@voidmix/i18n/types   runtime-only public types
```

## Ownership

- Own locale normalization, Cookie/localStorage adapters, runtime providers,
  formatters, and Paraglide generation integration.
- Applications and Mail own their `messages/` catalogs and Inlang settings.
- Generated output is disposable and must never be hand-edited.

## Constraints

- Paraglide is the only message compiler; do not add another ICU parser.
- `client` and runtime exports must not import build/compiler modules.
- Do not expose or recommend a full-catalog runtime barrel to application code.
- Generated namespace loaders must keep locale imports statically analyzable so
  Vite/Rolldown can split unused locale and namespace chunks.
- Domain and contract packages must not depend on this package.

## Verification

```bash
bun run --cwd packages/i18n check
bun run --cwd packages/i18n test
bun run --cwd packages/i18n i18n:generate -- <workspace-root>
```

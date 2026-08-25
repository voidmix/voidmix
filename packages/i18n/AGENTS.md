# @voidmix/i18n

## Purpose

Shared locale negotiation, React runtime helpers, Intl formatting, and the
`use-intl` facade used by application-owned static catalogs.

## Interface

```text
@voidmix/i18n         locale constants, parsing, formatting, translation
@voidmix/i18n/client  React provider/hooks and browser/Desktop storage
@voidmix/i18n/server  request locale resolution and sync translator factory
@voidmix/i18n/types   runtime-only public types
```

## Ownership

- Own locale normalization, Cookie/localStorage adapters, runtime providers,
  formatters, and the `use-intl` integration.
- Applications and Mail own their `messages/` JSON catalogs.
- Catalogs are statically imported by each composition root; there is no
  generated runtime output or async namespace loader.

## Constraints

- Business code imports translation hooks and translator types only from this
  package; it must not import `use-intl` directly.
- Keep `use-intl` implementation details behind the package facade, including
  its `AppConfig` and translator types.
- `client` and runtime exports must not import compiler or build modules.
- Domain and contract packages must not depend on this package.

## Verification

```bash
bun run --cwd packages/i18n check
bun run --cwd packages/i18n test
```

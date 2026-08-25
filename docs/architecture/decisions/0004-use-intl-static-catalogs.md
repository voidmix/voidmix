# ADR-0004: `use-intl` facade with static catalogs

## Status

Accepted; the recipient-locale clause is superseded by ADR-0005.

## Context

Voidmix needs one translation model across the server-rendered Web app, the
Tauri renderer, API errors, and authentication email. The app also needs stable
SSR/hydration output: translation lookup must not introduce a Promise or a
late catalog swap during the first render.

## Decision

`@voidmix/i18n` is the only translation facade exposed to business code. It
owns locale normalization, Accept-Language parsing, Cookie and localStorage
adapters, locale state, formatting helpers, and the React/server integration.
`use-intl` is an implementation dependency of that package; applications and
Mail do not import it directly or augment its global `AppConfig` type.

Web, Desktop, and Mail own their English and Chinese `messages/*.json` files.
Web and Desktop statically import both catalogs and mount them through the
shared `I18nProvider`. Components select a namespace with
`useTranslations("namespace")`. Mail creates a synchronous translator from
the same static catalogs through `@voidmix/i18n/server`.

Web resolves `voidmix_locale`, then `Accept-Language`, then `en`, and persists
changes in a one-year SameSite=Lax Cookie. Desktop resolves
`localStorage.voidmix_locale`, then `navigator.language`, then `en`. Locale
changes update the provider and storage synchronously; Web also updates the
document `lang` attribute.

API boundaries return stable error codes and structured data; diagnostic
messages remain server-side. Web and Desktop translate those codes from their
local `errors` namespace. `@voidmix/domain` and `@voidmix/contracts` do not
depend on i18n.

Mail uses `input.locale` when supplied, otherwise `MAIL_DEFAULT_LOCALE`,
falling back to `en`. Subject, preview, HTML, text, actions, and the HTML
`lang` attribute use the same resolved locale.

## Consequences

- Static catalogs eliminate i18n Suspense and translation content jumps during
  SSR, hydration, and locale changes.
- Each Web/Desktop/Mail runtime bundles both supported locale catalogs. This is
  an intentional simplicity and stability tradeoff; locale chunk splitting is
  deferred until bundle measurements justify it.
- Catalog drift is checked by workspace tests rather than a compiler-generated
  namespace registry.
- Root recovery pages keep their independent static copy so they remain
  renderable when an application chunk fails.

## Follow-up

Revisit per-locale or per-namespace splitting only when deployment or bundle
measurements show that the static catalog cost is material.

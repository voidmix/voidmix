# ADR-0004: Paraglide with locale and namespace chunks

## Status

Accepted

## Context

Voidmix needs one translation model across the server-rendered Web app, the
Tauri renderer, API errors, and authentication email. A conventional catalog
registry would make every language and feature reachable from the initial
browser bundle. A second home-grown message compiler would duplicate ICU
semantics and weaken message parameter types.

## Decision

Paraglide is the only message compiler and application-owned Inlang projects
and JSON catalogs are the source of truth. `@voidmix/i18n/build` invokes the
Paraglide compiler with locale modules, then emits stable namespace loaders.
Each loader contains explicit dynamic imports for `en` and `zh`; browser code
imports a namespace loader, never the generated all-message barrel.

`@voidmix/i18n` owns locale normalization, Accept-Language parsing, Cookie and
localStorage adapters, Intl formatting, the React provider, and the build
adapter. Runtime/client exports do not depend on Inlang, the Paraglide compiler,
Node filesystem APIs, or Vite.

Web resolves `voidmix_locale`, then `Accept-Language`, then `en`, and persists
changes in a one-year SameSite=Lax Cookie. Desktop resolves
`localStorage.voidmix_locale`, then `navigator.language`, then `en`. Locale
changes preload every active namespace and commit only after all loads succeed.

API boundaries return stable error codes and structured data; diagnostic
messages remain server-side. Web and Desktop translate those codes from an
`errors` namespace. `@voidmix/domain` and `@voidmix/contracts` do not depend on
i18n.

Mail owns its Inlang project and uses `MAIL_DEFAULT_LOCALE`, falling back to
`en`. Recipient locale is not added to mail method inputs. Subject, preview,
HTML, text, actions, and the HTML `lang` attribute use the same server locale.

`experimentalStaticLocale` is not used in the first implementation. It remains
an option for a future deployment that intentionally produces one static build
per locale.

## Consequences

- Catalog changes require `bun run i18n:generate`; Vite dev/build also runs the
  generator and watches its inputs.
- Generated output is disposable and must not be edited.
- Route and feature modules own namespace imports, so a root layout must not
  aggregate all catalog loaders.
- The production bundle can separate route code, namespace code, and locale
  code while retaining Paraglide message functions and fallback semantics.
- A failed locale load leaves the current locale and document state unchanged.

## Follow-up

Revisit static locale builds only when deployment or CDN measurements show that
the additional build matrix is worth the operational cost.

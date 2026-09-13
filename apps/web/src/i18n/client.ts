import {
  AsyncI18nProvider,
  createBrowserLocaleStorage,
  useFormatter,
  useLocale,
  useSetLocale,
  useTranslations as useCoreTranslations,
} from "@voidmix/i18n/client";
import type { TranslationValues, Translator } from "@voidmix/i18n";

import type en from "../../messages/en.json";

type WebCatalog = typeof en;
export type WebNamespace = keyof WebCatalog & string;
export type WebNamespaceKey<N extends WebNamespace> = keyof WebCatalog[N] & string;
export type WebTranslationValues = TranslationValues;
export type WebTranslator<N extends WebNamespace> = (
  key: WebNamespaceKey<N>,
  values?: WebTranslationValues,
) => string;

/**
 * Convert a namespace-scoped Web translator at the package boundary. The
 * shared helpers intentionally accept arbitrary keys because they operate on
 * error maps supplied by each host; Web call sites retain the stricter key
 * type until this explicit boundary.
 */
export function toCoreTranslator<N extends WebNamespace>(translator: WebTranslator<N>): Translator {
  return translator as unknown as Translator;
}

/**
 * Web's translation boundary. Namespace literals and catalog keys are checked
 * against the shipped English catalog while the runtime stays in @voidmix/i18n.
 */
export function useTranslations<N extends WebNamespace>(namespace: N): WebTranslator<N> {
  const translate = useCoreTranslations(namespace);
  return translate as unknown as WebTranslator<N>;
}

export { AsyncI18nProvider, createBrowserLocaleStorage, useFormatter, useLocale, useSetLocale };
export type { Translator };

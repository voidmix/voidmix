import { createElement, useCallback, useMemo, useState, type PropsWithChildren } from "react";
import { useTranslations as useIntlTranslations } from "use-intl";

import { IntlCatalogProvider, LocaleContextProvider, useI18nContext } from "./client/runtime.js";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./constants.js";
import { createFormatter, type Formatter } from "./formatter.js";
import type { Locale, LocaleStorage, MessagesByLocale } from "./types.js";
import type { Translator } from "./translator.js";

export type I18nProviderProps = PropsWithChildren<{
  locale: Locale;
  messages: MessagesByLocale;
  storage?: LocaleStorage;
  onLocaleChange?: (locale: Locale) => void | Promise<void>;
}>;

export type LocaleProviderProps = PropsWithChildren<{
  locale: Locale;
  storage?: LocaleStorage;
  onLocaleChange?: (locale: Locale) => void | Promise<void>;
}>;

export function LocaleProvider({
  children,
  locale: initialLocale,
  storage,
  onLocaleChange,
}: LocaleProviderProps) {
  const [locale, setActiveLocale] = useState(initialLocale);

  const setLocale = useCallback(
    async (nextLocale: Locale) => {
      if (!SUPPORTED_LOCALES.includes(nextLocale) || nextLocale === locale) return;
      storage?.write(nextLocale);
      setActiveLocale(nextLocale);
      await onLocaleChange?.(nextLocale);
    },
    [locale, onLocaleChange, storage],
  );

  return createElement(LocaleContextProvider, { locale, setLocale }, children);
}

export function I18nProvider({ messages, children, ...localeProps }: I18nProviderProps) {
  return createElement(
    LocaleProvider,
    localeProps,
    createElement(IntlMessagesProvider, { messages }, children),
  );
}

function IntlMessagesProvider({
  children,
  messages,
}: PropsWithChildren<{ messages: MessagesByLocale }>) {
  const locale = useLocale();
  return createElement(IntlCatalogProvider, { locale, messages: messages[locale] }, children);
}

export function useLocale() {
  return useI18nContext().locale;
}

export function useSetLocale() {
  return useI18nContext().setLocale;
}

export function useTranslations(namespace?: string): Translator {
  return useIntlTranslations(namespace as never) as unknown as Translator;
}

export function useFormatter(): Formatter {
  const locale = useLocale();
  return useMemo(() => createFormatter(locale, { timeZone: "UTC" }), [locale]);
}

export { DEFAULT_LOCALE };
export { AsyncI18nProvider, type AsyncI18nProviderProps } from "./client/async-provider.js";
export { createBrowserLocaleStorage, createLocalStorageLocaleStorage } from "./client/storage.js";
export type {
  Locale,
  LocaleStorage,
  MessageCatalog,
  MessageTree,
  MessagesByLocale,
  LocaleCatalogLoader,
} from "./types.js";

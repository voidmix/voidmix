import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { IntlProvider, useTranslations as useIntlTranslations } from "use-intl";

import {
  getLocaleCookie,
  serializeLegacyLocaleCookieRemoval,
  serializeLocaleCookie,
} from "./cookie.js";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, SUPPORTED_LOCALES } from "./constants.js";
import { createFormatter, type Formatter } from "./formatter.js";
import { formats } from "./formats.js";
import { normalizeLocale } from "./normalize.js";
import type {
  Locale,
  LocaleStorage,
  MessageCatalog,
  MessageTree,
  MessagesByLocale,
} from "./types.js";
import type { Translator } from "./translator.js";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
};

export type I18nProviderProps = PropsWithChildren<{
  locale: Locale;
  messages: MessagesByLocale;
  storage?: LocaleStorage;
  onLocaleChange?: (locale: Locale) => void | Promise<void>;
}>;

const I18nContext = createContext<I18nContextValue | null>(null);

export function createBrowserLocaleStorage(): LocaleStorage {
  return {
    read() {
      if (typeof document === "undefined") return undefined;
      return getLocaleCookie(document.cookie);
    },
    write(locale) {
      if (typeof document === "undefined") return;
      const secure = globalThis.location?.protocol === "https:";
      document.cookie = serializeLocaleCookie(locale, { secure });
      document.cookie = serializeLegacyLocaleCookieRemoval({ secure });
    },
  };
}

export function createLocalStorageLocaleStorage(): LocaleStorage {
  return {
    read() {
      try {
        return normalizeLocale(globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY));
      } catch {
        return undefined;
      }
    },
    write(locale) {
      try {
        globalThis.localStorage?.setItem(LOCALE_STORAGE_KEY, locale);
      } catch {
        // Storage can be unavailable in private or restricted WebViews.
      }
    },
  };
}

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

  const context = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return createElement(I18nContext.Provider, { value: context }, children);
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
  return createElement(IntlProvider, {
    locale,
    // A fixed server timezone keeps SSR and hydration deterministic.
    timeZone: "UTC",
    messages: messages[locale] as MessageTree,
    formats: {
      dateTime: formats.dateTime,
      list: formats.list,
      number: formats.number,
    },
    children,
  });
}

function useI18nContext() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("i18n hooks must be used within I18nProvider");
  return context;
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
export type { Locale, LocaleStorage, MessageCatalog, MessageTree, MessagesByLocale };

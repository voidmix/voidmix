import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  IntlProvider,
  useFormatter as useIntlFormatter,
  useTranslations as useIntlTranslations,
} from "use-intl";

import { normalizeLocale } from "./normalize.js";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, SUPPORTED_LOCALES } from "./constants.js";
import type { Formatter } from "./formatter.js";
import { formats } from "./formats.js";
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
      return normalizeLocale(
        document.cookie
          .split(";")
          .map((part) => part.trim())
          .find((part) => part.startsWith(`${LOCALE_STORAGE_KEY}=`))
          ?.slice(LOCALE_STORAGE_KEY.length + 1),
      );
    },
    write(locale) {
      if (typeof document === "undefined") return;
      document.cookie = `${LOCALE_STORAGE_KEY}=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
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
      await onLocaleChange?.(nextLocale);
      setActiveLocale(nextLocale);
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
  const formatter = useIntlFormatter();
  const formatDateTime = formatter.dateTime as unknown as (
    value: Date | number,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  const formatNumber = formatter.number as unknown as (
    value: bigint | number,
    options?: Intl.NumberFormatOptions,
  ) => string;
  return useMemo(
    () => ({
      dateTime: (
        value: Date | number,
        format?: keyof typeof formats.dateTime | Intl.DateTimeFormatOptions,
      ) => {
        if (typeof format === "string") return formatter.dateTime(value, format);
        return formatDateTime(value, format);
      },
      list: (
        values: Iterable<string>,
        format?: keyof typeof formats.list | Intl.ListFormatOptions,
      ) => {
        if (typeof format === "string") return formatter.list(values, format);
        return formatter.list(values, format);
      },
      number: (
        value: bigint | number,
        format?: keyof typeof formats.number | Intl.NumberFormatOptions,
      ) => {
        if (typeof format === "string") return formatter.number(value, format);
        return formatNumber(value, format);
      },
      relativeTime: (
        value: number,
        unit: Intl.RelativeTimeFormatUnit,
        format?: keyof typeof formats.relativeTime | Intl.RelativeTimeFormatOptions,
      ) =>
        new Intl.RelativeTimeFormat(
          locale,
          typeof format === "string" ? formats.relativeTime[format] : format,
        ).format(value, unit),
    }),
    [formatter, formatDateTime, formatNumber, locale],
  );
}

export { DEFAULT_LOCALE };
export type { Locale, LocaleStorage, MessageCatalog, MessageTree, MessagesByLocale };

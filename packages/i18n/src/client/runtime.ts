import { createContext, createElement, useContext, useMemo, type PropsWithChildren } from "react";
import { IntlProvider } from "use-intl";

import { formats } from "../formats.js";
import type { Locale, MessageCatalog, MessageTree } from "../types.js";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LocaleContextProvider({
  children,
  locale,
  setLocale,
}: PropsWithChildren<I18nContextValue>) {
  const context = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return createElement(I18nContext.Provider, { value: context }, children);
}

export function IntlCatalogProvider({
  children,
  locale,
  messages,
}: PropsWithChildren<{ locale: Locale; messages: MessageCatalog }>) {
  return createElement(IntlProvider, {
    locale,
    // A fixed server timezone keeps SSR and hydration deterministic.
    timeZone: "UTC",
    messages: messages as MessageTree,
    formats: {
      dateTime: formats.dateTime,
      list: formats.list,
      number: formats.number,
    },
    children,
  });
}

export function useI18nContext() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("i18n hooks must be used within I18nProvider");
  return context;
}

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type PropsWithChildren,
  type SetStateAction,
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
  LocaleCatalogLoader,
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

export type AsyncI18nProviderProps = PropsWithChildren<{
  locale: Locale;
  messages: MessageCatalog;
  loadCatalog: LocaleCatalogLoader;
  storage?: LocaleStorage;
  onLocaleChange?: (locale: Locale) => void | Promise<void>;
}>;

type AsyncLocaleCatalogOptions = Pick<
  AsyncI18nProviderProps,
  "locale" | "messages" | "loadCatalog"
> & {
  storage?: LocaleStorage | undefined;
  onLocaleChange?: ((locale: Locale) => void | Promise<void>) | undefined;
};

type ActiveCatalog = {
  locale: Locale;
  messages: MessageCatalog;
};

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

  return createElement(LocaleContextProvider, { locale, setLocale }, children);
}

export function I18nProvider({ messages, children, ...localeProps }: I18nProviderProps) {
  return createElement(
    LocaleProvider,
    localeProps,
    createElement(IntlMessagesProvider, { messages }, children),
  );
}

export function AsyncI18nProvider({
  children,
  locale,
  messages,
  loadCatalog,
  storage,
  onLocaleChange,
}: AsyncI18nProviderProps) {
  const {
    locale: activeLocale,
    messages: activeMessages,
    setLocale,
  } = useAsyncLocaleCatalog({
    locale,
    messages,
    loadCatalog,
    ...(storage ? { storage } : {}),
    ...(onLocaleChange ? { onLocaleChange } : {}),
  });

  return createElement(
    LocaleContextProvider,
    { locale: activeLocale, setLocale },
    createElement(
      IntlCatalogProvider,
      { locale: activeLocale, messages: activeMessages },
      children,
    ),
  );
}

function LocaleContextProvider({
  children,
  locale,
  setLocale,
}: PropsWithChildren<I18nContextValue>) {
  const context = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return createElement(I18nContext.Provider, { value: context }, children);
}

function useAsyncLocaleCatalog({
  locale,
  messages,
  loadCatalog,
  storage,
  onLocaleChange,
}: AsyncLocaleCatalogOptions) {
  const [active, setActive] = useState<ActiveCatalog>({ locale, messages });
  const requestId = useRef(0);
  const activeRef = useRef(active);
  const propsRef = useRef({ locale, messages });
  const catalogCache = useRef(new Map<Locale, Promise<MessageCatalog>>());
  const propsChanged = propsRef.current.locale !== locale || propsRef.current.messages !== messages;

  useEffect(() => {
    if (!propsChanged) return;
    syncExternalCatalog({
      locale,
      messages,
      propsRef,
      requestId,
      activeRef,
      catalogCache,
      setActive,
    });
  }, [locale, messages, propsChanged]);

  const setLocale = useCallback(
    async (nextLocale: Locale) => {
      const currentRequestId = ++requestId.current;
      const currentLocale = propsChanged ? locale : activeRef.current.locale;
      if (!SUPPORTED_LOCALES.includes(nextLocale) || nextLocale === currentLocale) return;

      const nextMessages = await getOrLoadCatalog(catalogCache.current, nextLocale, loadCatalog);
      await commitLocale({
        currentRequestId,
        requestId,
        nextLocale,
        messages: nextMessages,
        activeRef,
        setActive,
        storage,
        onLocaleChange,
      });
    },
    [loadCatalog, locale, onLocaleChange, propsChanged, storage],
  );

  return {
    locale: propsChanged ? locale : active.locale,
    messages: propsChanged ? messages : active.messages,
    setLocale,
  };
}

function syncExternalCatalog({
  locale,
  messages,
  propsRef,
  requestId,
  activeRef,
  catalogCache,
  setActive,
}: {
  locale: Locale;
  messages: MessageCatalog;
  propsRef: MutableRefObject<ActiveCatalog>;
  requestId: MutableRefObject<number>;
  activeRef: MutableRefObject<ActiveCatalog>;
  catalogCache: MutableRefObject<Map<Locale, Promise<MessageCatalog>>>;
  setActive: Dispatch<SetStateAction<ActiveCatalog>>;
}) {
  const nextActive = { locale, messages };
  propsRef.current = nextActive;
  requestId.current += 1;
  activeRef.current = nextActive;
  catalogCache.current.clear();
  catalogCache.current.set(locale, Promise.resolve(messages));
  setActive(nextActive);
}

function getOrLoadCatalog(
  catalogCache: Map<Locale, Promise<MessageCatalog>>,
  locale: Locale,
  loadCatalog: LocaleCatalogLoader,
) {
  const cached = catalogCache.get(locale);
  if (cached) return cached;

  const catalogPromise = Promise.resolve()
    .then(() => loadCatalog(locale))
    .catch((error: unknown) => {
      if (catalogCache.get(locale) === catalogPromise) catalogCache.delete(locale);
      throw error;
    });
  catalogCache.set(locale, catalogPromise);
  return catalogPromise;
}

async function commitLocale({
  currentRequestId,
  requestId,
  nextLocale,
  messages,
  activeRef,
  setActive,
  storage,
  onLocaleChange,
}: {
  currentRequestId: number;
  requestId: MutableRefObject<number>;
  nextLocale: Locale;
  messages: MessageCatalog;
  activeRef: MutableRefObject<ActiveCatalog>;
  setActive: Dispatch<SetStateAction<ActiveCatalog>>;
  storage?: LocaleStorage | undefined;
  onLocaleChange?: ((locale: Locale) => void | Promise<void>) | undefined;
}) {
  if (currentRequestId !== requestId.current) return;

  storage?.write(nextLocale);
  const nextActive = { locale: nextLocale, messages };
  activeRef.current = nextActive;
  setActive(nextActive);
  await onLocaleChange?.(nextLocale);
}

function IntlMessagesProvider({
  children,
  messages,
}: PropsWithChildren<{ messages: MessagesByLocale }>) {
  const locale = useLocale();
  return createElement(IntlCatalogProvider, { locale, messages: messages[locale] }, children);
}

function IntlCatalogProvider({
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
export type { LocaleCatalogLoader } from "./types.js";

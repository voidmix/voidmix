import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { createFormatter, type Formatter } from "./formatter.js";
import { createTranslator, type Translator } from "./translator.js";
import { normalizeLocale } from "./normalize.js";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, SUPPORTED_LOCALES } from "./constants.js";
import type {
  InitialCatalogs,
  Locale,
  LocaleStorage,
  MessageCatalog,
  NamespaceLoader,
} from "./types.js";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  readNamespace: (namespace: string, loader?: NamespaceLoader) => MessageCatalog;
  version: number;
};

type PendingCatalogs = Map<string, Map<Locale, Promise<MessageCatalog>>>;

export type I18nProviderProps = PropsWithChildren<{
  locale: Locale;
  loaders?: Record<string, NamespaceLoader>;
  initialCatalogs?: InitialCatalogs;
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

export function I18nProvider({
  children,
  locale: initialLocale,
  loaders = {},
  initialCatalogs = {},
  storage,
  onLocaleChange,
}: I18nProviderProps) {
  const [locale, setActiveLocale] = useState(initialLocale);
  const [version, setVersion] = useState(0);
  const cache = useMemo(() => {
    const result = new Map<string, Map<Locale, MessageCatalog>>();
    for (const [namespace, catalog] of Object.entries(initialCatalogs)) {
      if (catalog) result.set(namespace, new Map([[initialLocale, catalog]]));
    }
    return result;
  }, []);
  const pending = useRef<PendingCatalogs>(new Map()).current;
  const registeredLoaders = useRef(new Map(Object.entries(loaders))).current;
  const activeNamespaces = useRef(new Set<string>()).current;

  for (const [namespace, loader] of Object.entries(loaders)) {
    registeredLoaders.set(namespace, loader);
  }

  const loadNamespace = useCallback(
    async (namespace: string, targetLocale: Locale) => {
      const byLocale = cache.get(namespace) ?? new Map<Locale, MessageCatalog>();
      cache.set(namespace, byLocale);
      const existing = byLocale.get(targetLocale);
      if (existing) return existing;

      const loader = registeredLoaders.get(namespace);
      if (!loader) throw new Error(`No i18n loader is registered for namespace "${namespace}"`);
      const pendingByLocale = pending.get(namespace) ?? new Map<Locale, Promise<MessageCatalog>>();
      pending.set(namespace, pendingByLocale);
      const existingPending = pendingByLocale.get(targetLocale);
      if (existingPending) return existingPending;

      const request = loader(targetLocale)
        .then((messages) => {
          byLocale.set(targetLocale, messages);
          pendingByLocale.delete(targetLocale);
          setVersion((current) => current + 1);
          return messages;
        })
        .catch((error: unknown) => {
          pendingByLocale.delete(targetLocale);
          throw error;
        });
      pendingByLocale.set(targetLocale, request);
      return request;
    },
    [cache, pending, registeredLoaders],
  );

  const readNamespace = useCallback(
    (namespace: string, loader?: NamespaceLoader) => {
      if (loader) registeredLoaders.set(namespace, loader);
      activeNamespaces.add(namespace);
      const catalog = cache.get(namespace)?.get(locale);
      if (catalog) return catalog;

      const request = pending.get(namespace)?.get(locale) ?? loadNamespace(namespace, locale);
      throw request;
    },
    [activeNamespaces, cache, loadNamespace, locale, pending, registeredLoaders],
  );

  const setLocale = useCallback(
    async (nextLocale: Locale) => {
      if (!SUPPORTED_LOCALES.includes(nextLocale) || nextLocale === locale) return;
      await Promise.all(
        [...activeNamespaces].map((namespace) => loadNamespace(namespace, nextLocale)),
      );
      storage?.write(nextLocale);
      await onLocaleChange?.(nextLocale);
      setActiveLocale(nextLocale);
    },
    [activeNamespaces, loadNamespace, locale, onLocaleChange, storage],
  );

  const context = useMemo(
    () => ({ locale, setLocale, readNamespace, version }),
    [locale, readNamespace, setLocale, version],
  );
  return createElement(I18nContext.Provider, { value: context }, children);
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

export function useTranslations(namespace: string, loader?: NamespaceLoader): Translator {
  const { locale, readNamespace } = useI18nContext();
  const messages = readNamespace(namespace, loader);
  return useMemo(() => createTranslator(messages, locale), [locale, messages]);
}

/**
 * Translation hook for reusable components that may also be rendered outside
 * the application provider (for example, isolated component tests).
 */
export function useOptionalTranslations(
  namespace: string,
  loader: NamespaceLoader,
  fallback: Translator,
): Translator {
  const context = useContext(I18nContext);
  const messages = context ? context.readNamespace(namespace, loader) : null;
  return useMemo(
    () => (messages && context ? createTranslator(messages, context.locale) : fallback),
    [context, fallback, messages],
  );
}

export function useFormatter(): Formatter {
  const locale = useLocale();
  return useMemo(() => createFormatter(locale), [locale]);
}

export { DEFAULT_LOCALE };
export type { InitialCatalogs, Locale, LocaleStorage, MessageCatalog, NamespaceLoader };

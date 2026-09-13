import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type PropsWithChildren,
  type SetStateAction,
} from "react";

import { IntlCatalogProvider, LocaleContextProvider } from "./runtime.js";
import { SUPPORTED_LOCALES } from "../constants.js";
import type {
  IntlRuntimeOptions,
  Locale,
  LocaleCatalogLoader,
  LocaleStorage,
  MessageCatalog,
} from "../types.js";

export type AsyncI18nProviderProps = PropsWithChildren<{
  locale: Locale;
  messages: MessageCatalog;
  loadCatalog: LocaleCatalogLoader;
  storage?: LocaleStorage;
  onLocaleChange?: (locale: Locale) => void | Promise<void>;
  timeZone?: string;
  formats?: IntlRuntimeOptions["formats"];
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

export function AsyncI18nProvider({
  children,
  locale,
  messages,
  loadCatalog,
  storage,
  onLocaleChange,
  timeZone,
  formats,
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
    {
      locale: activeLocale,
      setLocale,
      ...(timeZone ? { timeZone } : {}),
      ...(formats ? { formats } : {}),
    },
    createElement(
      IntlCatalogProvider,
      {
        locale: activeLocale,
        messages: activeMessages,
        ...(timeZone ? { timeZone } : {}),
        ...(formats ? { formats } : {}),
      },
      children,
    ),
  );
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
  const catalogCache = useRef(
    new Map<Locale, Promise<MessageCatalog>>([[locale, Promise.resolve(messages)]]),
  );
  const mountedRef = useRef(true);
  useEffect(() => {
    // React StrictMode replays effects during development; a replay is still a
    // live mount and must be allowed to commit catalog requests.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestId.current += 1;
    };
  }, []);
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
        mountedRef,
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
  mountedRef,
}: {
  currentRequestId: number;
  requestId: MutableRefObject<number>;
  nextLocale: Locale;
  messages: MessageCatalog;
  activeRef: MutableRefObject<ActiveCatalog>;
  setActive: Dispatch<SetStateAction<ActiveCatalog>>;
  storage?: LocaleStorage | undefined;
  onLocaleChange?: ((locale: Locale) => void | Promise<void>) | undefined;
  mountedRef: MutableRefObject<boolean>;
}) {
  if (!mountedRef.current || currentRequestId !== requestId.current) return;

  try {
    storage?.write(nextLocale);
  } catch {
    // Persistence failures must not prevent a locale transition.
  }
  const nextActive = { locale: nextLocale, messages };
  activeRef.current = nextActive;
  setActive(nextActive);
  if (mountedRef.current) await onLocaleChange?.(nextLocale);
}

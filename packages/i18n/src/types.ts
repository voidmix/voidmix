import type { SUPPORTED_LOCALES } from "./constants.js";

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type MessageFunction = (values?: Record<string, unknown>) => string;
export type MessageCatalog = Record<string, MessageFunction>;
export type NamespaceLoader = (locale: Locale) => Promise<MessageCatalog>;
export type InitialCatalogs = Partial<Record<string, MessageCatalog>>;

export type LocaleStorage = {
  read(): Locale | undefined;
  write(locale: Locale): void;
};

export type LocaleSource = {
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
  fallbackLocale?: Locale;
};

export type AcceptLanguagePreference = {
  locale: string;
  quality: number;
};

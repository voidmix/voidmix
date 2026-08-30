import type { SUPPORTED_LOCALES } from "./constants.js";

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type MessageTree = {
  readonly [key: string]: string | MessageTree;
};

export type MessagesByLocale = Record<Locale, MessageTree>;

export type TranslationValues = Record<string, string | number | Date>;

export type MessageCatalog = MessageTree;

export type LocaleCatalogLoader = (locale: Locale) => Promise<MessageCatalog>;

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

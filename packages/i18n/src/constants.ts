const DEFAULT_LOCALE = "en" as const;
const LEGACY_LOCALE_COOKIE_NAME = "voidmix_locale" as const;
const LOCALE_COOKIE_NAME = "locale" as const;
const LOCALE_STORAGE_KEY = "voidmix_locale" as const;
const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const SUPPORTED_LOCALES = ["en", "zh"] as const;

export {
  DEFAULT_LOCALE,
  LEGACY_LOCALE_COOKIE_NAME,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
};

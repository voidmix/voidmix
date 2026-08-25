import { getLocaleCookie } from "./cookie.js";
import { resolveLocale } from "./resolve.js";
export { createTranslator, type CreateTranslatorOptions, type Translator } from "./translator.js";
import type { Locale } from "./types.js";

export function resolveRequestLocale(headers: Headers, fallbackLocale?: Locale): Locale {
  const cookieLocale = getLocaleCookie(headers.get("cookie"));
  const acceptLanguage = headers.get("accept-language");
  return resolveLocale({
    ...(cookieLocale ? { cookieLocale } : {}),
    ...(acceptLanguage ? { acceptLanguage } : {}),
    ...(fallbackLocale ? { fallbackLocale } : {}),
  });
}

export function resolveConfiguredLocale(
  value: string | undefined,
  fallbackLocale: Locale = "en",
): Locale {
  return resolveLocale({ ...(value ? { cookieLocale: value } : {}), fallbackLocale });
}

export { getLocaleCookie, resolveLocale } from "./index.js";
export type { Locale } from "./types.js";

import { LOCALE_COOKIE_MAX_AGE_SECONDS, LOCALE_COOKIE_NAME } from "./constants.js";
import { isLocale } from "./normalize.js";
import type { Locale } from "./types.js";

export function getLocaleCookie(cookieHeader: string | null | undefined): Locale | undefined {
  if (!cookieHeader) return undefined;
  const prefix = `${LOCALE_COOKIE_NAME}=`;
  const encoded = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  if (!encoded) return undefined;

  try {
    const value = decodeURIComponent(encoded);
    return isLocale(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function serializeLocaleCookie(locale: Locale, options: { secure?: boolean } = {}) {
  return [
    `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}`,
    "Path=/",
    `Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
    options.secure ? "Secure" : undefined,
  ]
    .filter((value): value is string => value !== undefined)
    .join("; ");
}

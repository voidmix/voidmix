import {
  LEGACY_LOCALE_COOKIE_NAME,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
} from "./constants.js";
import { isLocale } from "./normalize.js";
import type { Locale } from "./types.js";

export function getLocaleCookie(cookieHeader: string | null | undefined): Locale | undefined {
  if (!cookieHeader) return undefined;
  return (
    getNamedLocaleCookie(cookieHeader, LOCALE_COOKIE_NAME) ??
    getNamedLocaleCookie(cookieHeader, LEGACY_LOCALE_COOKIE_NAME)
  );
}

function getNamedLocaleCookie(cookieHeader: string, name: string): Locale | undefined {
  const prefix = `${name}=`;
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

export function serializeLegacyLocaleCookieRemoval(options: { secure?: boolean } = {}) {
  return [
    `${LEGACY_LOCALE_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "SameSite=Lax",
    options.secure ? "Secure" : undefined,
  ]
    .filter((value): value is string => value !== undefined)
    .join("; ");
}

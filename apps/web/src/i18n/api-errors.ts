import type { Translator } from "@voidmix/i18n";

/**
 * Every code the API can put on the wire, mapped to an `errors` message key.
 * `packages/api-runtime/src/runtime.ts` sends the code alone — the prose it used
 * to send was removed on the understanding that clients translate the code, so a
 * code missing from this map costs the user the reason for the rejection.
 */
const ERROR_KEYS = {
  USER_NOT_FOUND: "userNotFound",
  MAIL_NOT_CONFIGURED: "mailNotConfigured",
  REGISTRATION_DISABLED: "registrationDisabled",
  EMAIL_VERIFICATION_DISABLED: "emailVerificationDisabled",
  EMAIL_DOMAIN_NOT_ALLOWED: "emailDomainNotAllowed",
  PASSWORD_RESET_DISABLED: "passwordResetDisabled",
} as const;

export type ApiErrorCode = keyof typeof ERROR_KEYS;

export function isApiErrorCode(code: string | undefined): code is ApiErrorCode {
  return code !== undefined && code in ERROR_KEYS;
}

export function translateApiError(error: unknown, t: Translator): string {
  const code = readErrorCode(error);
  return t(isApiErrorCode(code) ? ERROR_KEYS[code] : "unknown");
}

/**
 * Localizes only errors whose code this map knows, so a caller can keep its own
 * more specific fallback for everything else.
 */
export function translateKnownApiError(error: unknown, t: Translator): string | null {
  const code = readErrorCode(error);
  return isApiErrorCode(code) ? t(ERROR_KEYS[code]) : null;
}

export function readErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

import {
  translateErrorCode,
  translateKnownErrorCode,
  type ErrorCodeMap,
  type Translator,
} from "@voidmix/i18n";

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
const ERROR_KEY_MAP: ErrorCodeMap = ERROR_KEYS;

export type ApiErrorCode = keyof typeof ERROR_KEYS;

export function isApiErrorCode(code: string | undefined): code is ApiErrorCode {
  return code !== undefined && code in ERROR_KEYS;
}

export function translateApiError(error: unknown, t: Translator): string {
  return translateErrorCode(error, t, ERROR_KEY_MAP);
}

/**
 * Localizes only errors whose code this map knows, so a caller can keep its own
 * more specific fallback for everything else.
 */
export function translateKnownApiError(error: unknown, t: Translator): string | null {
  return translateKnownErrorCode(error, t, ERROR_KEY_MAP);
}

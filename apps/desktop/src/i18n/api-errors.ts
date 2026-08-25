import { translateErrorCode, type ErrorCodeMap, type Translator } from "@voidmix/i18n";

const ERROR_KEYS = {
  USER_NOT_FOUND: "userNotFound",
  MAIL_NOT_CONFIGURED: "mailNotConfigured",
} as const;
const ERROR_KEY_MAP: ErrorCodeMap = ERROR_KEYS;

export function translateApiError(error: unknown, t: Translator): string {
  return translateErrorCode(error, t, ERROR_KEY_MAP);
}

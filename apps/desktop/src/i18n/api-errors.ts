import { readErrorDetails, type ErrorCodeMap, type Translator } from "@voidmix/i18n";

const ERROR_KEYS = {
  USER_NOT_FOUND: "userNotFound",
  MAIL_NOT_CONFIGURED: "mailNotConfigured",
} as const;
const ERROR_KEY_MAP: ErrorCodeMap = ERROR_KEYS;

export function translateApiError(error: unknown, t: Translator): string {
  const details = readErrorDetails(error);
  const key =
    details && Object.prototype.hasOwnProperty.call(ERROR_KEY_MAP, details.code)
      ? ERROR_KEY_MAP[details.code]
      : "unknown";
  return t(key ?? "unknown", details?.values);
}

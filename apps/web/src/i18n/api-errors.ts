import type { Translator } from "@voidmix/i18n";

const ERROR_KEYS = {
  USER_NOT_FOUND: "userNotFound",
  MAIL_NOT_CONFIGURED: "mailNotConfigured",
} as const;

export function translateApiError(error: unknown, t: Translator): string {
  const code = readErrorCode(error);
  return t(code && code in ERROR_KEYS ? ERROR_KEYS[code as keyof typeof ERROR_KEYS] : "unknown");
}

function readErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

import { readErrorDetails, translateKnownErrorCode, type TranslationValues } from "@voidmix/i18n";

import { translateKnownApiError } from "../../i18n/api-errors";
import { toCoreTranslator, type WebNamespaceKey, type WebTranslator } from "./client";

/** An error carrying a stable, localizable code across feature boundaries. */
export class LocalizedWebError extends Error {
  readonly code: string;
  readonly values?: TranslationValues;

  constructor(code: string, values?: TranslationValues) {
    super(code);
    this.name = "LocalizedWebError";
    this.code = code;
    if (values) this.values = values;
  }
}

const LOCAL_ERROR_KEYS = {
  SETTINGS_REQUEST_FAILED: "settingsRequestFailed",
  PROJECT_NOT_FOUND: "projectNotFound",
  TASK_NOT_FOUND: "taskNotFound",
  SESSION_NOT_FOUND: "sessionNotFound",
  PROJECT_NAME_REQUIRED: "projectNameRequired",
  TASK_TITLE_REQUIRED: "taskTitleRequired",
  PROMPT_REQUIRED: "promptRequired",
  PROJECT_WORKSPACE_UNAVAILABLE: "projectWorkspaceUnavailable",
  ASSET_NOT_ALLOWED: "assetNotAllowed",
  ASSET_TOO_LARGE: "assetTooLarge",
  TASK_DELETE_UNAVAILABLE: "taskDeleteUnavailable",
  UPLOAD_FAILED: "uploadError",
} as const satisfies Readonly<Record<string, WebNamespaceKey<"errors">>>;

/**
 * Translate API and feature errors without exposing server prose or an
 * implementation error's `message` to the user.
 */
export function translateWebError(
  error: unknown,
  translator: WebTranslator<"errors">,
  fallbackKey: WebNamespaceKey<"errors"> = "unknown",
): string {
  const apiMessage = translateKnownApiError(error, toCoreTranslator(translator));
  if (apiMessage) return apiMessage;

  const details = readErrorDetails(error);
  const code = details?.code;
  const key =
    code && Object.prototype.hasOwnProperty.call(LOCAL_ERROR_KEYS, code)
      ? LOCAL_ERROR_KEYS[code as keyof typeof LOCAL_ERROR_KEYS]
      : fallbackKey;
  return translator(key, details?.values);
}

export function readWebErrorCode(error: unknown): string | undefined {
  return readErrorDetails(error)?.code;
}

/** Translate only a known local code, useful when a caller has its own fallback. */
export function translateKnownWebError(
  error: unknown,
  translator: WebTranslator<"errors">,
): string | null {
  const details = readErrorDetails(error);
  if (!details?.code || !Object.prototype.hasOwnProperty.call(LOCAL_ERROR_KEYS, details.code)) {
    return null;
  }
  return translateKnownErrorCode(error, toCoreTranslator(translator), LOCAL_ERROR_KEYS);
}

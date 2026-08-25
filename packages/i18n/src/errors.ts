import type { Translator } from "./translator.js";

export type ErrorCodeMap = Readonly<Record<string, string>>;

export function readErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}

export function translateErrorCode(
  error: unknown,
  translator: Translator,
  errorKeys: ErrorCodeMap,
  fallbackKey = "unknown",
): string {
  const code = readErrorCode(error);
  const key = code && code in errorKeys ? (errorKeys[code] ?? fallbackKey) : fallbackKey;
  return translator(key);
}

export function translateKnownErrorCode(
  error: unknown,
  translator: Translator,
  errorKeys: ErrorCodeMap,
): string | null {
  const code = readErrorCode(error);
  if (!code || !(code in errorKeys)) return null;
  const key = errorKeys[code];
  return key ? translator(key) : null;
}

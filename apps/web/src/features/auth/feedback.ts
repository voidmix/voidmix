import type { Translator } from "@voidmix/i18n";
import { toast } from "@voidmix/ui/components/ui/toast";

import { translateKnownApiError } from "../../i18n/api-errors";

interface NotifyAuthFailureOptions {
  error: unknown;
  fallback: string;
  title: string;
  translateError: Translator;
}

export function notifyAuthFailure({
  error,
  fallback,
  title,
  translateError,
}: NotifyAuthFailureOptions): string {
  const description = getAuthErrorMessage(error, fallback, translateError);

  toast.add({
    title,
    description,
    type: "error",
    priority: "high",
  });

  return description;
}

/**
 * Order matters. The API sends a machine-readable code and no prose, so a known
 * code is the only way to state the actual reason in the reader's language.
 * Server or library prose is used only when no code matched, and is preferred
 * over the generic fallback because it is at least specific.
 */
export function getAuthErrorMessage(
  error: unknown,
  fallback: string,
  translateError: Translator,
): string {
  const translated = translateKnownApiError(error, translateError);
  if (translated) return translated;

  const message = extractErrorMessage(error);
  return message && !isTransportError(message) ? message : fallback;
}

function extractErrorMessage(error: unknown): string | null {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return null;
}

function isTransportError(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  return ["failed to fetch", "load failed", "networkerror"].some((value) =>
    normalizedMessage.includes(value),
  );
}

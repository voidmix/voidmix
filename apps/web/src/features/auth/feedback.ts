import { toast } from "@voidmix/ui/components/ui/toast";

interface NotifyAuthFailureOptions {
  error: unknown;
  fallback: string;
  title: string;
}

export function notifyAuthFailure({ error, fallback, title }: NotifyAuthFailureOptions): string {
  const description = getAuthErrorMessage(error, fallback);

  toast.add({
    title,
    description,
    type: "error",
    priority: "high",
  });

  return description;
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
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

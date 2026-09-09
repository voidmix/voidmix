import type { ChatMessage } from "./types";

export const previewCreatedAt = "2026-09-06T08:00:00.000Z";
export const previewResponseFallback =
  "In the Northstar sample workspace, the final color pass remains the current blocker. Three reviewers are ready, and the sound mix is already in progress.";

export function createPreviewResponse(
  _prompt: string,
  content = previewResponseFallback,
  createdAt = previewCreatedAt,
): ChatMessage {
  return {
    id: "assistant-preview",
    role: "assistant",
    content,
    ...(content === previewResponseFallback ? { contentKey: "previewResponse" as const } : {}),
    timestamp: { createdAt, kind: "preview" },
  };
}

export const initialChatMessages = [] satisfies readonly ChatMessage[];

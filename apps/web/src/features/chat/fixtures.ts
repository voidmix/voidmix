import type { ChatMessage } from "./types";

export function createPreviewResponse(
  _prompt: string,
  content = "In the Northstar sample workspace, the final color pass remains the current blocker. Three reviewers are ready, and the sound mix is already in progress.",
): ChatMessage {
  return {
    id: "assistant-preview",
    role: "assistant",
    content,
    timestamp: "Preview",
  };
}

export const initialChatMessages = [] satisfies readonly ChatMessage[];

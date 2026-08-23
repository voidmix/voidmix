export type ChatMessageRole = "assistant" | "user";

export interface ChatMessage {
  content: string;
  id: string;
  role: ChatMessageRole;
  timestamp: string;
}

import type { ChatMessage } from "../types";
import { ChatMessageRow } from "./message";

interface MessageListProps {
  messages: readonly ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-0 py-4"
      aria-label="Conversation"
    >
      {messages.map((message) => (
        <ChatMessageRow key={message.id} message={message} />
      ))}
    </div>
  );
}

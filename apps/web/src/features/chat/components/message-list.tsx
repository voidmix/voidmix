import type { ChatMessage } from "../types";
import { useTranslations } from "@voidmix/i18n/client";
import { ChatMessageRow } from "./message";

interface MessageListProps {
  messages: readonly ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  const t = useTranslations("home");

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-0 py-4"
      aria-label={t("conversation")}
    >
      {messages.map((message) => (
        <ChatMessageRow key={message.id} message={message} />
      ))}
    </div>
  );
}

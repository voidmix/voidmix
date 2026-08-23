import { Sparkle } from "@phosphor-icons/react";
import { Avatar } from "@voidmix/ui/avatar";
import { cn } from "@voidmix/ui/lib/utils";

import type { ChatMessage } from "../types";

interface MessageProps {
  message: ChatMessage;
}

export function ChatMessageRow({ message }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <article
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] gap-2.5",
        isUser && "grid-cols-[minmax(0,1fr)_auto]",
      )}
      data-role={message.role}
    >
      <div
        className={cn(
          "inline-flex size-[1.9rem] items-center justify-center rounded-lg bg-primary/15 text-primary",
          isUser && "col-start-2 row-start-1",
        )}
      >
        {isUser ? <Avatar name="Alex Morgan" size="small" /> : <Sparkle aria-hidden="true" />}
      </div>
      <div className={cn("min-w-0", isUser && "col-start-1 row-start-1 flex flex-col items-end")}>
        <div className="flex min-h-[1.4rem] items-center gap-1.5">
          <strong className="text-[0.76rem]">{isUser ? "You" : "Voidmix"}</strong>
          <span className="text-[0.68rem] text-muted-foreground">{message.timestamp}</span>
        </div>
        <p
          className={cn(
            "mt-1 max-w-3xl text-[0.8rem] leading-[1.6] text-secondary-foreground text-pretty",
            isUser &&
              "rounded-[0.75rem_0.25rem_0.75rem_0.75rem] bg-muted px-3 py-2 text-foreground",
          )}
        >
          {message.content}
        </p>
      </div>
    </article>
  );
}

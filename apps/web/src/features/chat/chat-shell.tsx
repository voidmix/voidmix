import { ChatCircleDots } from "@phosphor-icons/react";
import { Badge } from "@voidmix/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@voidmix/ui/components/ui/card";
import { useState } from "react";

import { Composer } from "./components/composer";
import { MessageList } from "./components/message-list";
import { createPreviewResponse, initialChatMessages } from "./fixtures";
import type { ChatMessage } from "./types";

export function ChatShell() {
  const [messages, setMessages] = useState<readonly ChatMessage[]>(initialChatMessages);
  const hasMessages = messages.length > 0;

  function handleSubmit(prompt: string) {
    setMessages((current) => [
      ...current,
      { id: `user-${current.length}`, role: "user", content: prompt, timestamp: "Now" },
      {
        ...createPreviewResponse(prompt),
        id: `assistant-${current.length}`,
      },
    ]);
  }

  if (!hasMessages) {
    return (
      <section className="flex flex-1 items-center justify-center py-12" id="ask-voidmix">
        <div className="w-full">
          <Composer onSubmit={handleSubmit} />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Northstar preview data stays in this browser.
          </p>
        </div>
      </section>
    );
  }

  return (
    <Card className="min-h-[34rem] min-w-0 flex-1 scroll-mt-20" id="ask-voidmix">
      <CardHeader className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ChatCircleDots aria-hidden="true" weight="fill" />
          </span>
          <div>
            <CardTitle className="text-base">Ask Voidmix</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Northstar workspace</p>
          </div>
        </div>
        <Badge>Preview data</Badge>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 pt-0">
        <MessageList messages={messages} />
        <p className="text-xs text-muted-foreground">
          Uses Northstar sample data. Messages stay in this browser.
        </p>
        <Composer onSubmit={handleSubmit} />
      </CardContent>
    </Card>
  );
}

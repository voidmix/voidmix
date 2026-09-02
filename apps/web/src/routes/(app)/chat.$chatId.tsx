import { createFileRoute } from "@tanstack/react-router";

import { ChatWorkspace } from "../../features/home/components/chat-workspace";

export const Route = createFileRoute("/(app)/chat/$chatId")({
  component: ChatRoute,
  head: () => ({
    meta: [
      { title: "Chat | Voidmix" },
      { name: "description", content: "Continue a local Voidmix workspace conversation." },
    ],
  }),
});

function ChatRoute() {
  const { chatId } = Route.useParams();
  return <ChatWorkspace chatId={chatId} />;
}

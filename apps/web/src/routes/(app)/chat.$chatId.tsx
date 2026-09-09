import { createFileRoute } from "@tanstack/react-router";

import { ChatWorkspace } from "../../features/home/components/chat-workspace";
import { localizedRouteHead } from "../../i18n/route-meta";

export const Route = createFileRoute("/(app)/chat/$chatId")({
  component: ChatRoute,
  head: ({ matches }) => localizedRouteHead(matches, "chatTitle", "chatDescription"),
});

function ChatRoute() {
  const { chatId } = Route.useParams();
  return <ChatWorkspace chatId={chatId} />;
}

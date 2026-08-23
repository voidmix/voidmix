import { createFileRoute } from "@tanstack/react-router";

import { ChatShell } from "../features/chat/chat-shell";
import { HomeNavbar } from "../features/home/components/home-navbar";

export const Route = createFileRoute("/")({ component: HomeRoute });

function HomeRoute() {
  return (
    <main className="min-h-dvh bg-background" id="overview">
      <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <HomeNavbar />
        <ChatShell />
      </div>
    </main>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { ChatShell } from "../features/chat/chat-shell";
import { HomeFooter } from "../features/home/components/home-footer";
import { HomeNavbar } from "../features/home/components/home-navbar";

export const Route = createFileRoute("/")({ component: HomeRoute });

function HomeRoute() {
  return (
    <main className="flex min-h-dvh flex-col bg-background" id="overview">
      <HomeNavbar />
      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6">
        <ChatShell />
      </div>
      <HomeFooter />
    </main>
  );
}

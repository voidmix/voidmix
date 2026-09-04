import { createFileRoute } from "@tanstack/react-router";

import { HomeFooter } from "../features/home/components/home-footer";
import { WorkspaceLayout } from "../features/home/components/workspace-layout";
import { useSidebarOpen } from "../features/home/sidebar-store";

export const Route = createFileRoute("/")({ component: HomeRoute });

function HomeRoute() {
  const sidebarOpen = useSidebarOpen();

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <WorkspaceLayout />
      <HomeFooter sidebarCollapsed={!sidebarOpen} />
    </main>
  );
}

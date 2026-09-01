import { createFileRoute } from "@tanstack/react-router";

import { HomeFooter } from "../features/home/components/home-footer";
import { WorkspaceLayout } from "../features/home/components/workspace-layout";

export const Route = createFileRoute("/")({ component: HomeRoute });

function HomeRoute() {
  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <WorkspaceLayout />
      <HomeFooter />
    </main>
  );
}

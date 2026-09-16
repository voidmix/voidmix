import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/activity")({
  validateSearch: (search: Record<string, unknown>) => ({
    filter:
      search.filter === "uploads" || search.filter === "downloads" || search.filter === "backups"
        ? search.filter
        : ("all" as const),
  }),
  component: lazyRouteComponent(() => import("../../features/activity/page"), "ActivityPage"),
});

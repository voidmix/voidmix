import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { loadCloudSnapshot } from "../lib/cloud";

export const Route = createFileRoute("/")({
  ssr: false,
  loader: ({ abortController }) => loadCloudSnapshot({ signal: abortController.signal }),
  component: lazyRouteComponent(() => import("../features/overview/page"), "OverviewPage"),
});

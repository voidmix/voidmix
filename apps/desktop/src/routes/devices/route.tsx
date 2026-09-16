import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { loadCloudSnapshot } from "../../lib/cloud";

export const Route = createFileRoute("/devices")({
  ssr: false,
  loader: ({ abortController }) => loadCloudSnapshot({ signal: abortController.signal }),
  component: lazyRouteComponent(() => import("../../features/devices/page"), "DevicesPage"),
});

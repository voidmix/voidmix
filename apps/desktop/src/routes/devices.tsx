import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/devices")({
  component: lazyRouteComponent(() => import("../features/devices/page"), "DevicesPage"),
});

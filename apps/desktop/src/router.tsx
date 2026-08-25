import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from "@tanstack/react-router";
import { DesktopShell } from "./features/shell/desktop-shell";

const rootRoute = createRootRoute({ component: DesktopShell });

const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: lazyRouteComponent(() => import("./features/overview/page"), "OverviewPage"),
});

const activityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/activity",
  component: lazyRouteComponent(() => import("./features/activity/page"), "ActivityPage"),
});

const devicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/devices",
  component: lazyRouteComponent(() => import("./features/devices/page"), "DevicesPage"),
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: lazyRouteComponent(() => import("./features/settings/page"), "SettingsPage"),
});

const routeTree = rootRoute.addChildren([
  overviewRoute,
  activityRoute,
  devicesRoute,
  settingsRoute,
]);

export const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

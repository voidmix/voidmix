import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { ActivityPage } from "./features/activity/page";
import { DevicesPage } from "./features/devices/page";
import { OverviewPage } from "./features/overview/page";
import { SettingsPage } from "./features/settings/page";
import { DesktopShell } from "./features/shell/desktop-shell";

const rootRoute = createRootRoute({ component: DesktopShell });

const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: OverviewPage,
});

const activityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/activity",
  component: ActivityPage,
});

const devicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/devices",
  component: DevicesPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
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

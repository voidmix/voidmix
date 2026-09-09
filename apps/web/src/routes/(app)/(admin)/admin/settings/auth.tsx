import { createFileRoute } from "@tanstack/react-router";

import { AuthSettings } from "../../../../../features/admin/settings/auth-settings";
import { localizedRouteHead } from "../../../../../i18n/route-meta";

export const Route = createFileRoute("/(app)/(admin)/admin/settings/auth")({
  component: AuthSettings,
  head: ({ matches }) =>
    localizedRouteHead(matches, "authSettingsTitle", "authSettingsDescription"),
});

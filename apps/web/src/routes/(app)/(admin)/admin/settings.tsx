import { createFileRoute } from "@tanstack/react-router";

import { MailSettings } from "../../../../features/admin/settings/mail-settings";
import { localizedRouteHead } from "../../../../i18n/route-meta";

export const Route = createFileRoute("/(app)/(admin)/admin/settings")({
  component: MailSettings,
  head: ({ matches }) =>
    localizedRouteHead(matches, "mailSettingsTitle", "mailSettingsDescription"),
});

import { createFileRoute } from "@tanstack/react-router";

import { MailSettingsPage } from "../../../../features/admin/settings/page";

export const Route = createFileRoute("/(app)/(admin)/admin/settings")({
  component: MailSettingsPage,
  head: () => ({
    meta: [
      { title: "Mail settings | Voidmix Control" },
      { name: "description", content: "Configure Voidmix system mail delivery." },
    ],
  }),
});

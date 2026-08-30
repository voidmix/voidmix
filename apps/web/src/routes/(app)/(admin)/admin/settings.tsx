import { createFileRoute } from "@tanstack/react-router";

import { MailSettings } from "../../../../features/admin/settings/mail-settings";

export const Route = createFileRoute("/(app)/(admin)/admin/settings")({
  component: MailSettings,
  head: () => ({
    meta: [
      { title: "Mail settings | Voidmix Control" },
      { name: "description", content: "Configure Voidmix system mail delivery." },
    ],
  }),
});

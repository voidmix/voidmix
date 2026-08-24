import { createFileRoute } from "@tanstack/react-router";

import { AuthSettingsPage } from "../../../../../features/admin/settings/auth-page";

export const Route = createFileRoute("/(app)/(admin)/admin/settings/auth")({
  component: AuthSettingsPage,
  head: () => ({
    meta: [
      { title: "Authentication settings | Voidmix Control" },
      { name: "description", content: "Configure Voidmix authentication policy." },
    ],
  }),
});

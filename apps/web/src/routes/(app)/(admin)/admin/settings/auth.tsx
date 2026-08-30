import { createFileRoute } from "@tanstack/react-router";

import { AuthSettings } from "../../../../../features/admin/settings/auth-settings";

export const Route = createFileRoute("/(app)/(admin)/admin/settings/auth")({
  component: AuthSettings,
  head: () => ({
    meta: [
      { title: "Authentication settings | Voidmix Control" },
      { name: "description", content: "Configure Voidmix authentication policy." },
    ],
  }),
});

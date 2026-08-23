import { createFileRoute } from "@tanstack/react-router";

import { UserDirectoryPage } from "../../../features/admin/users/page";

export const Route = createFileRoute("/(app)/(admin)/admin")({
  component: UserDirectoryPage,
  head: () => ({
    meta: [
      { title: "Voidmix Control" },
      { name: "description", content: "User operations and audit control for Voidmix." },
    ],
  }),
});

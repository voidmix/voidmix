import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "../features/admin-shell";
import { UserDirectoryPage } from "../features/users/page";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <AdminShell>
      <UserDirectoryPage />
    </AdminShell>
  );
}

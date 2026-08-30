import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "../../../features/admin/shell";

export const Route = createFileRoute("/(app)/(admin)")({ component: AdminLayout });

function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}

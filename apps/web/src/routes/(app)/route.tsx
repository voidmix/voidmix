import { Navigate, Outlet, createFileRoute } from "@tanstack/react-router";

import { useSession } from "../../lib/auth-client";

export const Route = createFileRoute("/(app)")({ component: AuthenticatedAppLayout });

function AuthenticatedAppLayout() {
  const session = useSession();

  if (session.isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-4 text-sm text-muted-foreground">
        Loading session…
      </div>
    );
  }
  if (!session.data) return <Navigate to="/login" />;

  return <Outlet />;
}

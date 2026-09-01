import { Navigate, Outlet, createFileRoute, useLocation } from "@tanstack/react-router";

import { normalizeAuthRedirect } from "../../features/auth/route-search";
import { useSession } from "../../lib/auth-client";

export const Route = createFileRoute("/(app)")({ component: AuthenticatedAppLayout });

function AuthenticatedAppLayout() {
  const session = useSession();
  const location = useLocation();

  if (session.isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-4 text-sm text-muted-foreground">
        Loading session…
      </div>
    );
  }
  if (!session.data) {
    const redirect = normalizeAuthRedirect(location.href);
    return <Navigate replace to="/login" {...(redirect ? { search: { redirect } } : {})} />;
  }

  return <Outlet />;
}

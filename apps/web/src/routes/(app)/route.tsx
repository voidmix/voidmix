import { Navigate, Outlet, createFileRoute, redirect, useLocation } from "@tanstack/react-router";

import { useTranslations } from "../../i18n/client";
import { normalizeAuthRedirect } from "../../features/auth/route-search";
import { useSession } from "../../lib/auth-client";
import { hasServerSessionCookie } from "../../lib/auth-route";

export const Route = createFileRoute("/(app)")({
  beforeLoad: async ({ location }) => {
    if (!(await hasServerSessionCookie())) {
      const redirectTo = `${location.pathname}${location.searchStr}${location.hash ? `#${location.hash}` : ""}`;
      throw redirect({
        to: "/login",
        search: { redirect: redirectTo },
      });
    }
  },
  component: AuthenticatedAppLayout,
});

function AuthenticatedAppLayout() {
  const t = useTranslations("workspaceUi");
  const session = useSession();
  const location = useLocation();
  if (session.isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-4 text-sm text-muted-foreground">
        {t("loadingSession")}
      </div>
    );
  }
  if (!session.data?.user) {
    const redirect = normalizeAuthRedirect(
      `${location.pathname}${location.searchStr}${location.hash ? `#${location.hash}` : ""}`,
    );
    return <Navigate replace to="/login" {...(redirect ? { search: { redirect } } : {})} />;
  }

  return <Outlet />;
}

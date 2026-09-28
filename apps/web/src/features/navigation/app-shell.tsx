import { FolderSimple, List, UsersThree } from "@phosphor-icons/react";
import { Link, Outlet, useLocation, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@voidmix/ui/components/ui/button";
import { Avatar } from "@voidmix/ui/avatar";
import { Logo } from "@voidmix/ui/logo";
import { Modal } from "@voidmix/ui/modal";
import { signOut, useSession } from "../../lib/auth-client";
import { useTranslations } from "../../i18n/client";
import { AccountMenu } from "./account-menu";

export function AppShell() {
  const t = useTranslations("navigation");
  const session = useSession();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const refreshing = useRouterState({ select: (state) => state.isLoading });
  const [open, setOpen] = useState(false);
  const role = (session.data?.user as { role?: string } | undefined)?.role;
  const name = session.data?.user.name ?? t("user");
  const admin = role === "admin" || role === "owner";
  const items = [
    { to: "/projects", label: t("projects"), icon: FolderSimple },
    ...(admin ? ([{ to: "/admin", label: t("users"), icon: UsersThree }] as const) : []),
  ] as const;
  const navigation = (
    <nav aria-label={t("navigation")} className="workbench-nav">
      {items.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          aria-label={label}
          title={label}
          onClick={() => setOpen(false)}
          activeProps={{ "aria-current": "page" }}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
  return (
    <div className="workbench-shell">
      <a className="skip-link" href="#main-content">
        {t("skipContent")}
      </a>
      <aside className="workbench-sidebar">
        <Link to="/projects" className="workbench-brand" aria-label={t("projects")}>
          <Logo />
        </Link>
        {navigation}
        <div className="workbench-account">
          <Avatar name={name} size="small" />
          <span className="truncate">{name}</span>
          <AccountMenu
            name={name}
            role={role}
            onSignOut={async () => {
              await signOut();
              await navigate({ to: "/" });
            }}
          />
        </div>
      </aside>
      <div className="workbench-frame">
        <header className="workbench-topbar">
          <div className="workbench-mobile-menu">
            <Modal
              title={t("navigation")}
              closeLabel={t("close")}
              open={open}
              onOpenChange={setOpen}
              drawer
              trigger={
                <Button size="icon" variant="ghost" aria-label={t("openNavigation")}>
                  <List aria-hidden="true" />
                </Button>
              }
            >
              {navigation}
              <AccountMenu
                name={name}
                role={role}
                onSignOut={async () => {
                  await signOut();
                  await navigate({ to: "/" });
                }}
              />
            </Modal>
          </div>
          <span>{pathname.startsWith("/admin") ? t("users") : t("projects")}</span>
          {refreshing ? (
            <span role="status" className="ml-auto text-xs text-muted-foreground">
              {t("refreshing")}
            </span>
          ) : null}
        </header>
        <main id="main-content" className="workbench-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

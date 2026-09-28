import { FolderSimple, List, UsersThree } from "@phosphor-icons/react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Avatar } from "@voidmix/ui/avatar";
import { BeuiButton } from "@voidmix/ui/beui-button";
import { BeuiSidebar } from "@voidmix/ui/beui-sidebar";
import { BeuiSidebarNavigation, BeuiSidebarItem } from "@voidmix/ui/beui-sidebar-navigation";
import { Logo } from "@voidmix/ui/logo";
import { Modal } from "@voidmix/ui/modal";
import { signOut, useSession } from "../../lib/auth-client";
import { useTranslations } from "../../i18n/client";
import { AccountMenu } from "./account-menu";

export function BeuiAppShell() {
  const t = useTranslations("navigation");
  const session = useSession();
  const navigate = useNavigate();
  const refreshing = useRouterState({ select: (state) => state.isLoading });
  const [open, setOpen] = useState(false);
  const role = (session.data?.user as { role?: string } | undefined)?.role;
  const name = session.data?.user.name ?? t("user");
  const items = [
    { to: "/projects", label: t("projects"), icon: FolderSimple },
    ...(role === "admin" || role === "owner"
      ? ([{ to: "/admin", label: t("users"), icon: UsersThree }] as const)
      : []),
  ] as const;
  const navigation = (
    <BeuiSidebarNavigation label={t("navigation")}>
      {items.map(({ to, label, icon: Icon }) => (
        <BeuiSidebarItem key={to} id={to} active={to === "/projects"}>
          <Link
            to={to}
            aria-label={label}
            title={label}
            activeProps={{ "aria-current": "page" }}
            onClick={() => setOpen(false)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Link>
        </BeuiSidebarItem>
      ))}
    </BeuiSidebarNavigation>
  );
  const accountMenu = (
    <AccountMenu
      name={name}
      role={role}
      surfaceClassName="beui-theme"
      onSignOut={async () => {
        await signOut();
        await navigate({ to: "/" });
      }}
    />
  );
  return (
    <div className="beui-theme beui-workbench">
      <a className="skip-link" href="#main-content">
        {t("skipContent")}
      </a>
      <BeuiSidebar className="beui-workbench-sidebar">
        <Link to="/projects" className="beui-workbench-brand" aria-label={t("projects")}>
          <Logo />
        </Link>
        {navigation}
        <div className="workbench-account beui-workbench-account">
          <Avatar name={name} size="small" />
          <span className="truncate">{name}</span>
          {accountMenu}
        </div>
      </BeuiSidebar>
      <div className="min-w-0">
        <header className="beui-workbench-topbar">
          <div className="beui-workbench-mobile">
            <Modal
              title={t("navigation")}
              closeLabel={t("close")}
              open={open}
              onOpenChange={setOpen}
              drawer
              surfaceClassName="beui-theme"
              trigger={
                <BeuiButton size="icon" variant="ghost" aria-label={t("openNavigation")}>
                  <List aria-hidden="true" />
                </BeuiButton>
              }
            >
              {navigation}
              <div className="mt-auto">{accountMenu}</div>
            </Modal>
          </div>
          <FolderSimple className="beui-context-icon" aria-hidden="true" />
          <span>{t("projects")}</span>
          {refreshing ? (
            <span role="status" className="ml-auto text-xs text-muted-foreground">
              {t("refreshing")}
            </span>
          ) : null}
        </header>
        <main id="main-content" className="beui-workbench-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

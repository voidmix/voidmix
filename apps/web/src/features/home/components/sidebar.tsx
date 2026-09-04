import { ArrowRight, Gear, Plus, UsersThree } from "@phosphor-icons/react";
import { useTranslations } from "@voidmix/i18n/client";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@voidmix/ui/components/ui/sidebar";
import { Logo } from "@voidmix/ui/logo";
import { signOut, useSession } from "../../../lib/auth-client";

import {
  navigation,
  navigationClassName,
  navigationHref,
  launcherNavigation,
  recentThreads,
  type WorkspaceSectionId,
} from "../data";
import { UserDropdown } from "./user-dropdown";
import { LoginButton } from "./login-button";

export function HomeSidebar({
  activeSection = "overview",
  onNewTask,
  variant = "workspace",
  collapsed = false,
}: {
  activeSection?: WorkspaceSectionId;
  onNewTask?: () => void;
  variant?: "launcher" | "workspace";
  collapsed?: boolean;
}) {
  const t = useTranslations("home");
  const navigate = useNavigate();
  const session = useSession();
  const isLauncher = variant === "launcher";
  const items = isLauncher ? launcherNavigation : navigation;

  const handleNewTask =
    onNewTask ??
    (() => {
      window.location.hash = "ask-voidmix";
    });

  async function handleSignOut() {
    await signOut();
    await navigate({ to: "/" });
  }

  const user = session.data?.user;
  const role = (user as { role?: string | null } | undefined)?.role;

  return (
    <SidebarProvider className="contents" open={!collapsed}>
      <aside
        aria-label={t("workspace")}
        className={`fixed inset-y-0 left-0 z-40 flex h-dvh min-h-0 flex-col overflow-y-auto border-r border-border bg-muted px-2.5 py-[1.15rem] pb-[0.9rem] transition-[width,padding,border-color] duration-200 ease-out motion-reduce:transition-none max-[760px]:hidden ${collapsed ? "w-[4.5rem]" : "w-[15rem]"}`}
        id="workspace-sidebar"
      >
        <div className="flex flex-col gap-5">
          <a
            aria-label="Voidmix home"
            className={`inline-flex w-fit px-1.5 text-foreground ${collapsed ? "mx-auto size-10 -translate-y-1 justify-center px-0" : ""}`}
            href="/"
          >
            <Logo
              className={`text-[1.08rem] [&>img]:size-6 ${collapsed ? "[&>span]:hidden" : ""}`}
            />
          </a>
          {!isLauncher ? (
            <Button
              aria-label={t("switchWorkspace")}
              className={`min-h-[3.1rem] w-full justify-start gap-2.5 rounded-[0.55rem] border border-border bg-card px-2.5 py-2.5 text-left transition-colors hover:border-input hover:bg-primary/10 ${collapsed ? "mx-auto size-10 min-h-0 justify-center gap-0 px-0" : ""}`}
              variant="ghost"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-[0.35rem] bg-primary text-[0.72rem] font-extrabold text-primary-foreground">
                N
              </span>
              <span
                className={`flex min-w-0 flex-1 flex-col gap-0.5 text-[0.78rem] font-bold ${collapsed ? "hidden" : ""}`}
              >
                <small className="text-[0.7rem] font-medium text-muted-foreground">
                  {t("workspace")}
                </small>
                Northstar
              </span>
              <ArrowRight
                aria-hidden="true"
                className={`size-3.5 rotate-90 text-muted-foreground ${collapsed ? "hidden" : ""}`}
              />
            </Button>
          ) : null}
        </div>

        <Button
          aria-label={t("newTask")}
          className={`mt-4 w-full border-primary/20 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out hover:border-primary/30 hover:shadow-md motion-reduce:transition-none ${collapsed ? "mx-auto size-10 min-h-0 justify-center gap-0 px-0" : "justify-start gap-2.5 px-2.5"}`}
          onClick={handleNewTask}
          size="lg"
          variant="primary"
        >
          <Plus aria-hidden="true" weight="bold" />
          <span className={collapsed ? "hidden" : ""}>{t("newTask")}</span>
        </Button>

        <nav aria-label={t("workspace")} className="mt-5 flex flex-col gap-0.5">
          <SidebarMenu>
            {items.map((item) => {
              const Icon = item.icon;
              const current = activeSection === item.id;

              return (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    className={navigationClassName({ current, compact: collapsed })}
                    isActive={current}
                    render={
                      <a
                        aria-current={current ? "page" : undefined}
                        aria-label={t(item.messageKey)}
                        href={navigationHref(item)}
                      />
                    }
                    tooltip={t(item.messageKey)}
                  >
                    <Icon aria-hidden="true" weight={current ? "fill" : "regular"} />
                    <span className={collapsed ? "hidden" : ""}>{t(item.messageKey)}</span>
                    {"count" in item && item.count ? (
                      <b
                        className={`ml-auto flex min-w-[1.15rem] items-center justify-center rounded-full bg-input px-1 text-[0.65rem] font-bold text-secondary-foreground ${collapsed ? "hidden" : ""}`}
                      >
                        {item.count}
                      </b>
                    ) : null}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </nav>

        {!isLauncher ? (
          <div
            className={`mt-7 flex flex-col gap-0.5 border-t border-border pt-[1.15rem] ${collapsed ? "hidden" : ""}`}
          >
            <p className="mb-1.5 px-2.5 text-[0.7rem] font-semibold tracking-[0.025em] text-muted-foreground">
              {t("recent")}
            </p>
            {recentThreads.map((thread) => (
              <a
                className="flex min-h-9 items-center gap-2.5 overflow-hidden rounded-md px-2.5 text-[0.72rem] text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                href="#thread"
                key={thread}
              >
                <span className="size-1.5 shrink-0 rounded-full bg-input" />
                {thread}
              </a>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
          {!isLauncher ? (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={navigationClassName({ current: false, compact: collapsed })}
                  render={<a aria-label={t("team")} href="#team" />}
                  tooltip={t("team")}
                >
                  <UsersThree aria-hidden="true" />
                  <span className={collapsed ? "hidden" : ""}>{t("team")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={navigationClassName({ current: false, compact: collapsed })}
                  render={<a aria-label={t("settings")} href="#settings" />}
                  tooltip={t("settings")}
                >
                  <Gear aria-hidden="true" />
                  <span className={collapsed ? "hidden" : ""}>{t("settings")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          ) : null}
          {user ? (
            <div className={`mt-2 pt-2 ${collapsed ? "flex justify-center" : ""}`}>
              <UserDropdown
                onNewTask={handleNewTask}
                onSignOut={handleSignOut}
                user={{
                  email: user.email,
                  name: user.name,
                  ...(role !== undefined ? { role } : {}),
                }}
                variant="sidebar"
                compact={collapsed}
              />
            </div>
          ) : session.isPending ? null : (
            <div className={`mt-2 pt-2 ${collapsed ? "flex justify-center" : ""}`}>
              <LoginButton compact={collapsed} />
            </div>
          )}
        </div>
      </aside>
    </SidebarProvider>
  );
}

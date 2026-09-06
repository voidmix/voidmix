import { Gear, Plus, UsersThree } from "@phosphor-icons/react";
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
  navigationGroups,
  launcherNavigation,
  recentThreads,
  type WorkspaceSectionId,
} from "../data";
import { UserDropdown } from "./user-dropdown";
import { LoginButton } from "./login-button";
import type { DemoOverlayState } from "./demo-overlay";

export function HomeSidebar({
  activeSection = "overview",
  onNewTask,
  onOpenOverlay: _onOpenOverlay,
  counts,
  variant = "workspace",
  collapsed = false,
}: {
  activeSection?: WorkspaceSectionId;
  onNewTask?: () => void;
  onOpenOverlay?: (state: Exclude<DemoOverlayState, null>) => void;
  counts?: { inbox?: number; reviews?: number; decisions?: number };
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
  const countFor = (id: string) => counts?.[id as keyof typeof counts];
  return (
    <SidebarProvider className="contents" open={!collapsed}>
      <aside
        aria-label={t("workspace")}
        className={`fixed inset-y-0 left-0 z-40 flex h-dvh min-h-0 flex-col overflow-y-auto border-r border-border bg-muted px-2.5 py-[1.15rem] pb-[0.9rem] transition-[width,padding] duration-200 ease-out motion-reduce:transition-none max-[760px]:hidden ${collapsed ? "w-[4.5rem]" : "w-[15rem]"}`}
        id="workspace-sidebar"
      >
        <a
          aria-label="Voidmix home"
          className={`inline-flex w-fit px-1.5 text-foreground ${collapsed ? "mx-auto size-10 -translate-y-1 justify-center px-0" : ""}`}
          href="/"
        >
          <Logo className={`text-[1.08rem] [&>img]:size-6 ${collapsed ? "[&>span]:hidden" : ""}`} />
        </a>
        <Button
          aria-label={t("newTask")}
          className={`mt-5 w-full border-primary/20 shadow-sm ${collapsed ? "mx-auto size-10 min-h-0 justify-center gap-0 px-0" : "justify-start gap-2.5 px-2.5"}`}
          onClick={handleNewTask}
          size="lg"
          variant="primary"
        >
          <Plus weight="bold" />
          <span className={collapsed ? "hidden" : ""}>{t("newTask")}</span>
        </Button>
        <nav aria-label={t("workspace")} className="mt-5 grid gap-5">
          {navigationGroups.map((group) => (
            <div className={collapsed ? "" : "grid gap-1"} key={group.key}>
              {
                <p
                  className={`px-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground ${collapsed ? "sr-only" : ""}`}
                >
                  {t(group.key)}
                </p>
              }
              <SidebarMenu>
                {group.ids.map((id) => {
                  const item = items.find((candidate) => candidate.id === id);
                  if (!item) return null;
                  const Icon = item.icon;
                  const current = activeSection === item.id;
                  const count = countFor(item.id) ?? ("count" in item ? item.count : undefined);
                  return (
                    <SidebarMenuItem key={item.id}>
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
                        {count ? (
                          <b
                            className={`ml-auto flex min-w-[1.15rem] items-center justify-center rounded-full bg-input px-1 text-[0.65rem] font-bold ${collapsed ? "hidden" : ""}`}
                          >
                            {count}
                          </b>
                        ) : null}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </div>
          ))}
        </nav>
        {!isLauncher ? (
          <div
            className={`mt-7 grid gap-1 border-t border-border pt-[1.15rem] ${collapsed ? "hidden" : ""}`}
          >
            <p className="px-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {t("recentConversations")}
            </p>
            {recentThreads.map((thread) => (
              <a
                className="flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-[0.72rem] text-muted-foreground hover:bg-card hover:text-foreground"
                href="#thread"
                key={thread}
              >
                <span className="size-1.5 shrink-0 rounded-full bg-input" />
                {thread}
              </a>
            ))}
          </div>
        ) : null}
        <div className="mt-auto grid gap-1 border-t border-border pt-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={navigationClassName({ current: false, compact: collapsed })}
                render={<a aria-label={t("team")} href="#team" />}
                tooltip={t("team")}
              >
                <UsersThree />
                <span className={collapsed ? "hidden" : ""}>{t("team")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={navigationClassName({ current: false, compact: collapsed })}
                render={<a aria-label={t("settings")} href="#settings" />}
                tooltip={t("settings")}
              >
                <Gear />
                <span className={collapsed ? "hidden" : ""}>{t("settings")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          {user ? (
            <UserDropdown
              onNewTask={handleNewTask}
              onSignOut={handleSignOut}
              user={{ email: user.email, name: user.name, ...(role !== undefined ? { role } : {}) }}
              variant="sidebar"
              compact={collapsed}
            />
          ) : session.isPending ? null : (
            <LoginButton compact={collapsed} />
          )}
        </div>
      </aside>
    </SidebarProvider>
  );
}

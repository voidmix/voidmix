import { ArrowRight, Gear, Plus, UsersThree } from "@phosphor-icons/react";
import { useTranslations } from "@voidmix/i18n/client";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
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
}: {
  activeSection?: WorkspaceSectionId;
  onNewTask?: () => void;
  variant?: "launcher" | "workspace";
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
    <aside
      aria-label={t("workspace")}
      className="fixed inset-y-0 left-0 z-40 flex h-dvh min-h-0 w-[4.75rem] flex-col overflow-y-auto border-r border-border bg-muted px-2.5 py-[1.15rem] pb-[0.9rem] min-[1181px]:w-[15rem] min-[1181px]:px-3 max-[760px]:hidden"
    >
      <div className="flex flex-col gap-5">
        <a
          aria-label="Voidmix home"
          className="inline-flex w-fit px-1.5 text-foreground max-[1180px]:px-0"
          href="/"
        >
          <Logo className="text-[1.08rem] max-[1180px]:[&>span]:hidden [&>img]:size-6" />
        </a>
        {!isLauncher ? (
          <Button
            aria-label={t("switchWorkspace")}
            className="min-h-[3.1rem] w-full justify-start gap-2.5 rounded-[0.55rem] border border-border bg-card px-2.5 py-2.5 text-left transition-colors hover:border-input hover:bg-primary/10 max-[1180px]:size-10 max-[1180px]:min-h-0 max-[1180px]:justify-center max-[1180px]:gap-0 max-[1180px]:px-0"
            variant="ghost"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-[0.35rem] bg-primary text-[0.72rem] font-extrabold text-primary-foreground">
              N
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-[0.78rem] font-bold max-[1180px]:hidden">
              <small className="text-[0.7rem] font-medium text-muted-foreground">
                {t("workspace")}
              </small>
              Northstar
            </span>
            <ArrowRight
              aria-hidden="true"
              className="size-3.5 rotate-90 text-muted-foreground max-[1180px]:hidden"
            />
          </Button>
        ) : null}
      </div>

      <Button
        aria-label={t("newTask")}
        className="mt-5 w-full max-[1180px]:size-10 max-[1180px]:min-h-0 max-[1180px]:px-0"
        onClick={handleNewTask}
        size="lg"
        variant="secondary"
      >
        <Plus aria-hidden="true" data-icon="inline-start" weight="bold" />
        <span className="max-[1180px]:hidden">{t("newTask")}</span>
      </Button>

      <nav aria-label={t("workspace")} className="mt-7 flex flex-col gap-0.5">
        <p className="mb-1.5 px-2.5 text-[0.7rem] font-semibold tracking-[0.025em] text-muted-foreground max-[1180px]:hidden">
          {t("workspace")}
        </p>
        {items.map((item) => {
          const Icon = item.icon;
          const current = activeSection === item.id;

          return (
            <a
              aria-current={current ? "page" : undefined}
              aria-label={t(item.messageKey)}
              className={navigationClassName({ current })}
              href={navigationHref(item)}
              key={item.label}
            >
              <Icon aria-hidden="true" weight={current ? "fill" : "regular"} />
              <span className="max-[1180px]:hidden">{t(item.messageKey)}</span>
              {"count" in item && item.count ? (
                <b className="ml-auto flex min-w-[1.15rem] items-center justify-center rounded-full bg-input px-1 text-[0.65rem] font-bold text-secondary-foreground">
                  {item.count}
                </b>
              ) : null}
            </a>
          );
        })}
      </nav>

      {!isLauncher ? (
        <div className="mt-7 flex flex-col gap-0.5 border-t border-border pt-[1.15rem] max-[1180px]:hidden">
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
          <>
            <a
              aria-label={t("team")}
              className={navigationClassName({ current: false })}
              href="#team"
            >
              <UsersThree aria-hidden="true" />
              <span className="max-[1180px]:hidden">{t("team")}</span>
            </a>
            <a
              aria-label={t("settings")}
              className={navigationClassName({ current: false })}
              href="#settings"
            >
              <Gear aria-hidden="true" />
              <span className="max-[1180px]:hidden">{t("settings")}</span>
            </a>
          </>
        ) : null}
        {user ? (
          <div className="mt-2 border-t border-border pt-2">
            <UserDropdown
              onNewTask={handleNewTask}
              onSignOut={handleSignOut}
              user={{
                email: user.email,
                name: user.name,
                ...(role !== undefined ? { role } : {}),
              }}
              variant="sidebar"
            />
          </div>
        ) : session.isPending ? null : (
          <div className="mt-2 border-t border-border pt-2">
            <LoginButton />
          </div>
        )}
      </div>
    </aside>
  );
}

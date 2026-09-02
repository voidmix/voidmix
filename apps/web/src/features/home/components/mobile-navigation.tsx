import { Gear, List, Plus, UserCircle, UsersThree } from "@phosphor-icons/react";
import { useTranslations } from "@voidmix/i18n/client";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@voidmix/ui/components/ui/dropdown-menu";
import { Logo } from "@voidmix/ui/logo";

import { LanguageSwitcher } from "../../../components/language-switcher";
import { ThemeSwitcher } from "../../../components/theme-switcher";
import { signOut, useSession } from "../../../lib/auth-client";
import { launcherNavigation, mobileNavigationItems, navigationHref } from "../data";
import type { WorkspaceSectionId } from "../data";
import { UserDropdown } from "./user-dropdown";

function navigateTo(href: string) {
  window.location.hash = href.slice(1);
}

function MobileNavigationMenu({
  activeSection,
  onNewTask,
  variant,
}: {
  activeSection: WorkspaceSectionId;
  onNewTask?: () => void;
  variant: "launcher" | "workspace";
}) {
  const t = useTranslations("home");
  const authT = useTranslations("auth");
  const navigate = useNavigate();
  const session = useSession();
  const isLauncher = variant === "launcher";
  const items = isLauncher ? launcherNavigation : mobileNavigationItems;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button aria-label={t("openWorkspaceNavigation")} size="icon-lg" variant="ghost">
            <List aria-hidden="true" data-icon="inline-start" weight="bold" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-60" sideOffset={8}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("workspace")}</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => {
              if (onNewTask) {
                onNewTask();
              } else {
                navigateTo("#ask-voidmix");
              }
            }}
          >
            <Plus aria-hidden="true" weight="bold" />
            {t("newTask")}
          </DropdownMenuItem>
          {items.map((item) => {
            const Icon = item.icon;
            const current = item.id === activeSection;

            return (
              <DropdownMenuItem
                aria-current={current ? "page" : undefined}
                className={current ? "bg-accent text-accent-foreground" : undefined}
                key={item.label}
                onClick={() => navigateTo("href" in item ? item.href : navigationHref(item))}
              >
                <Icon aria-hidden="true" weight={current ? "fill" : "regular"} />
                {t(item.messageKey)}
                {"count" in item ? <DropdownMenuShortcut>{item.count}</DropdownMenuShortcut> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>

        {!isLauncher ? (
          <>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigateTo("#team")}>
                <UsersThree aria-hidden="true" />
                {t("team")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateTo("#settings")}>
                <Gear aria-hidden="true" />
                {t("settings")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}

        {!session.data ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>{authT("account")}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => void navigate({ to: "/login" })}>
                <UserCircle aria-hidden="true" />
                {authT("signIn")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void navigate({ to: "/signup" })}>
                <Plus aria-hidden="true" weight="bold" />
                {authT("createAccount")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MobileNavigation({
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  async function handleSignOut() {
    await signOut();
    await navigate({ to: "/" });
  }

  const handleNewTask = onNewTask ?? (() => void navigate({ to: "/" }));
  const user = session.data?.user;
  const role = (user as { role?: string | null } | undefined)?.role;

  return (
    <header className="relative grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-muted px-4 py-2.5 max-[760px]:grid">
      <a aria-label="Voidmix home" className="inline-flex text-foreground" href="/">
        <Logo className="text-base" />
      </a>

      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-[0.35rem] bg-primary text-[0.72rem] font-extrabold text-primary-foreground">
          N
        </span>
        <span className="flex min-w-0 flex-col">
          <small className="text-[0.68rem] leading-tight text-muted-foreground">
            {t("workspace")}
          </small>
          <strong className="truncate text-[0.78rem] leading-[1.35]">Northstar</strong>
        </span>
      </div>

      <div className="flex items-center gap-0.5">
        <LanguageSwitcher />
        <ThemeSwitcher />
        {isMounted && user ? (
          <UserDropdown
            onNewTask={handleNewTask}
            onSignOut={handleSignOut}
            user={{
              email: user.email,
              name: user.name,
              ...(role !== undefined ? { role } : {}),
            }}
          />
        ) : null}
        {isMounted ? (
          <MobileNavigationMenu
            activeSection={activeSection}
            variant={variant}
            {...(onNewTask ? { onNewTask } : {})}
          />
        ) : (
          <Button
            aria-label={t("openWorkspaceNavigation")}
            className="min-h-11 min-w-11"
            disabled
            size="icon-lg"
            variant="ghost"
          >
            <List aria-hidden="true" data-icon="inline-start" weight="bold" />
          </Button>
        )}
      </div>
    </header>
  );
}

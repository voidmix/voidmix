import { Gear, List, Plus, UserCircle, UsersThree } from "@phosphor-icons/react";
import { useOptionalTranslations } from "@voidmix/i18n/client";
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

import { loadHomeMessages } from "../../../i18n/home";
import { mobileNavigationItems } from "../data";

function navigateTo(href: string) {
  window.location.hash = href.slice(1);
}

function MobileNavigationMenu() {
  const t = useOptionalTranslations("home", loadHomeMessages, (key) => {
    const fallback: Record<string, string> = {
      openWorkspaceNavigation: "Open workspace navigation",
      workspace: "Workspace",
      newTask: "New task",
      navOverview: "Overview",
      navInbox: "Inbox",
      navProjects: "Projects",
      navReviews: "Reviews",
      navDecisions: "Decisions",
      navAssets: "Assets",
      team: "Team",
      settings: "Settings",
      account: "Account",
      admin: "Admin",
    };
    return fallback[key] ?? key;
  });

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
          <DropdownMenuItem onClick={() => navigateTo("#ask-voidmix")}>
            <Plus aria-hidden="true" weight="bold" />
            {t("newTask")}
          </DropdownMenuItem>
          {mobileNavigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <DropdownMenuItem key={item.label} onClick={() => navigateTo(item.href)}>
                <Icon aria-hidden="true" weight={item.current ? "fill" : "regular"} />
                {t(item.messageKey)}
                {"count" in item ? <DropdownMenuShortcut>{item.count}</DropdownMenuShortcut> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>

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

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("account")}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigateTo("#account")}>
            <UserCircle aria-hidden="true" />
            Alex Morgan
            <DropdownMenuShortcut>{t("admin")}</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MobileNavigation() {
  const t = useOptionalTranslations("home", loadHomeMessages, (key) =>
    key === "workspace" ? "Workspace" : "Open workspace navigation",
  );
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-20 grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-muted px-4 py-2.5 max-[760px]:grid">
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

      {isMounted ? (
        <MobileNavigationMenu />
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
    </header>
  );
}

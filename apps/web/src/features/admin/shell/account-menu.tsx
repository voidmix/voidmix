import { DotsThree, SignOut } from "@phosphor-icons/react";
import { Suspense, useState } from "react";

import { Button } from "@voidmix/ui/components/ui/button";
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
import { LazyThemeMenuItems, loadThemeMenuItems } from "../../../components/theme-menu-lazy";
import { useTranslations } from "../../../i18n/client";

export function AccountMenu({
  name,
  role,
  onSignOut,
}: {
  name: string;
  role: string | undefined;
  onSignOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("admin");
  const prefetchThemeMenu = () => {
    void loadThemeMenuItems().catch(() => undefined);
  };

  return (
    <DropdownMenu
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          prefetchThemeMenu();
        }
      }}
      open={open}
    >
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={t("openAccountMenu")}
            onFocus={prefetchThemeMenu}
            onPointerDown={prefetchThemeMenu}
            size="icon-sm"
            variant="ghost"
          >
            <DotsThree aria-hidden="true" weight="bold" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-44" side="top" sideOffset={8}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2">
            <span className="truncate text-foreground">{name}</span>
            <DropdownMenuShortcut>{role ?? t("user")}</DropdownMenuShortcut>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("theme")}</DropdownMenuLabel>
          {open ? (
            <Suspense fallback={null}>
              <LazyThemeMenuItems />
            </Suspense>
          ) : null}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onClick={() => void onSignOut()}>
          <SignOut aria-hidden="true" />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

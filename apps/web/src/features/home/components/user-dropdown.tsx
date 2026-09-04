import { CaretDown, Plus, SignOut } from "@phosphor-icons/react";
import { useTranslations } from "@voidmix/i18n/client";
import { Avatar } from "@voidmix/ui/avatar";
import { Button } from "@voidmix/ui/components/ui/button";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@voidmix/ui/components/ui/dropdown-menu";

export interface UserDropdownUser {
  email: string;
  name: string;
  role?: string | null;
}

export function UserDropdown({
  onNewTask,
  onSignOut,
  user,
  variant = "header",
  compact = false,
}: {
  onNewTask?: () => void;
  onSignOut: () => Promise<void>;
  user: UserDropdownUser;
  variant?: "header" | "sidebar";
  compact?: boolean;
}) {
  const t = useTranslations("auth");
  const homeT = useTranslations("home");
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const displayName = user.name || user.email;
  const role = user.role || t("member");
  const isSidebar = variant === "sidebar";

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger
        render={
          <Button
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label={t("openUserMenu")}
            className={
              isSidebar
                ? `min-h-9 w-full justify-start gap-2.5 rounded-md px-1.5 text-left ${compact ? "mx-auto size-10 min-h-0 justify-center gap-0 px-0" : ""}`
                : "max-w-48 gap-2 rounded-md px-2 max-[899px]:size-9 max-[899px]:px-0"
            }
            title={`${t("openUserMenu")}: ${displayName}`}
            size="sm"
            variant="ghost"
          >
            <Avatar aria-hidden="true" className="size-6" name={displayName} size="small" />
            <span
              className={
                isSidebar
                  ? `min-w-0 flex-1 truncate text-xs font-medium ${compact ? "hidden" : ""}`
                  : "hidden min-w-0 truncate text-xs font-medium min-[900px]:inline"
              }
            >
              {displayName}
            </span>
            <CaretDown
              aria-hidden="true"
              className={isSidebar ? `${compact ? "hidden" : ""}` : "hidden min-[900px]:inline"}
            />
          </Button>
        }
      />
      <DropdownMenuContent
        align="end"
        className="min-w-64"
        side={isSidebar ? "right" : "bottom"}
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-start gap-2.5 px-2 py-2.5">
            <Avatar aria-hidden="true" name={displayName} size="medium" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <strong className="truncate text-sm text-foreground">{displayName}</strong>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
              <span className="mt-1 font-mono text-[0.64rem] font-normal text-muted-foreground">
                {role}
              </span>
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        {onNewTask ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onNewTask}>
              <Plus aria-hidden="true" weight="bold" />
              {homeT("newTask")}
            </DropdownMenuItem>
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={signingOut}
          onClick={() => void handleSignOut()}
          variant="destructive"
        >
          <SignOut aria-hidden="true" />
          {signingOut ? t("signingOut") : t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

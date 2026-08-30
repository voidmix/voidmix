import { GearSix, SquaresFour, UsersThree } from "@phosphor-icons/react";
import { Link, useMatchRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { cn } from "@voidmix/ui/lib/utils";

export function AdminNavigation({ canManageSettings }: { canManageSettings: boolean }) {
  const matchRoute = useMatchRoute();

  return (
    <nav
      aria-label="Admin navigation"
      className="flex flex-col gap-1 max-[760px]:flex-row max-[760px]:justify-end"
    >
      <NavItem
        active={Boolean(matchRoute({ to: "/", fuzzy: false }))}
        icon={<SquaresFour weight="regular" />}
        label="Overview"
        to="/"
      />
      <NavItem
        active={Boolean(matchRoute({ to: "/admin", fuzzy: false }))}
        icon={<UsersThree weight="regular" />}
        label="Users"
        to="/admin"
      />
      {canManageSettings ? (
        <NavItem
          active={Boolean(matchRoute({ to: "/admin/settings", fuzzy: true }))}
          icon={<GearSix weight="regular" />}
          label="Settings"
          to="/admin/settings"
        />
      ) : null}
    </nav>
  );
}

function NavItem({
  icon,
  label,
  to,
  active = false,
}: {
  icon: ReactNode;
  label: string;
  to: "/" | "/admin" | "/admin/settings" | "/admin/settings/auth";
  active?: boolean;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-lg px-3 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 max-[1050px]:justify-center max-[1050px]:px-0 max-[760px]:size-9 max-[760px]:min-h-0",
        active && "bg-accent text-accent-foreground",
      )}
      to={to}
    >
      <span className="flex text-base">{icon}</span>
      <span className="max-[1050px]:hidden">{label}</span>
    </Link>
  );
}

import { GearSix, SquaresFour, UsersThree } from "@phosphor-icons/react";
import { Link, useMatchRoute, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Avatar } from "@voidmix/ui/avatar";
import { Badge } from "@voidmix/ui/components/ui/badge";
import { Button } from "@voidmix/ui/components/ui/button";
import { Logo } from "@voidmix/ui/logo";
import { cn } from "@voidmix/ui/lib/utils";
import { signOut, useSession } from "../../lib/auth-client";

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const session = useSession();
  const role = (session.data?.user as { role?: string } | undefined)?.role;
  const canManageSettings = role === "admin" || role === "owner";

  async function handleSignOut() {
    await signOut();
    await navigate({ to: "/" });
  }

  return (
    <main className="grid min-h-svh grid-cols-[15rem_minmax(0,1fr)] bg-background text-foreground max-[1050px]:grid-cols-[4.75rem_minmax(0,1fr)] max-[760px]:block">
      <aside className="sticky top-0 flex h-svh flex-col border-r bg-card px-3.5 py-6 max-[1050px]:px-2.5 max-[760px]:static max-[760px]:grid max-[760px]:h-auto max-[760px]:grid-cols-[auto_1fr] max-[760px]:items-center max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:px-4 max-[760px]:py-2.5">
        <Link className="block px-3 pt-1.5 pb-8 max-[1050px]:px-0 max-[760px]:p-0" to="/">
          <Logo
            className="text-sm max-[1050px]:[&>span]:hidden [&>svg]:size-6"
            label="Voidmix / Control"
          />
        </Link>
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
        <div className="mt-auto border-t pt-4 max-[760px]:hidden">
          <Badge className="mx-1.5 mb-4" variant="secondary">
            All systems normal
          </Badge>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 px-1.5 pt-1">
            <Avatar name={session.data?.user.name ?? "Operator"} size="small" />
            <div className="flex flex-col gap-0.5 max-[1050px]:hidden">
              <strong className="text-xs">{session.data?.user.name ?? "Operator"}</strong>
              <span className="text-[0.7rem] text-muted-foreground">{role ?? "User"}</span>
            </div>
            <Button
              aria-label="Open account menu"
              className="max-[1050px]:hidden"
              size="icon-sm"
              variant="ghost"
            >
              <span aria-hidden="true">•••</span>
            </Button>
            <Button
              className="max-[1050px]:hidden"
              size="sm"
              variant="ghost"
              onClick={() => void handleSignOut()}
            >
              Sign out
            </Button>
          </div>
        </div>
      </aside>
      <section className="min-w-0 px-[3.4vw] pb-16 max-[760px]:px-4 max-[760px]:pb-10">
        <div
          aria-label="System status"
          className="flex min-h-12 items-center gap-6 border-b font-mono text-[0.65rem] text-muted-foreground max-[760px]:gap-3 max-[760px]:overflow-hidden max-[760px]:whitespace-nowrap"
        >
          <span className="flex items-center gap-2">
            <i
              aria-hidden="true"
              className="size-1.5 rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary),transparent_85%)]"
            />
            Production control online
          </span>
          <span className="max-[760px]:hidden">API latency 42 ms</span>
          <span className="max-[760px]:hidden">Last audit write 18 s ago</span>
        </div>
        {children}
      </section>
    </main>
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

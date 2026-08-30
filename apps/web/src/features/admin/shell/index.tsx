import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Avatar } from "@voidmix/ui/avatar";
import { Badge } from "@voidmix/ui/components/ui/badge";
import { Logo } from "@voidmix/ui/logo";
import { signOut, useSession } from "../../../lib/auth-client";

import { AccountMenu } from "./account-menu";
import { AdminNavigation } from "./navigation";

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const session = useSession();
  const role = (session.data?.user as { role?: string } | undefined)?.role;
  const canManageSettings = role === "admin" || role === "owner";
  const operatorName = session.data?.user.name ?? "Operator";

  async function handleSignOut() {
    await signOut();
    await navigate({ to: "/" });
  }

  return (
    <main className="grid min-h-svh grid-cols-[15rem_minmax(0,1fr)] bg-background text-foreground max-[1050px]:grid-cols-[4.75rem_minmax(0,1fr)] max-[760px]:block">
      <aside className="sticky top-0 flex h-svh flex-col border-r bg-card px-3.5 py-6 max-[1050px]:px-2.5 max-[760px]:static max-[760px]:grid max-[760px]:h-auto max-[760px]:grid-cols-[auto_1fr_auto] max-[760px]:items-center max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:px-4 max-[760px]:py-2.5">
        <Link className="block px-3 pt-1.5 pb-8 max-[1050px]:px-0 max-[760px]:p-0" to="/">
          <Logo
            className="text-sm max-[1050px]:[&>span]:hidden [&>img]:size-6"
            label="Voidmix / Control"
          />
        </Link>
        <AdminNavigation canManageSettings={canManageSettings} />
        <div className="mt-auto border-t pt-4 max-[760px]:mt-0 max-[760px]:border-t-0 max-[760px]:pt-0">
          <Badge className="mx-1.5 mb-4 max-[1050px]:hidden" variant="secondary">
            All systems normal
          </Badge>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 px-1.5 pt-1 max-[1050px]:grid-cols-1 max-[1050px]:justify-items-center max-[1050px]:gap-2 max-[1050px]:px-0 max-[760px]:pt-0">
            <Avatar className="max-[760px]:hidden" name={operatorName} size="small" />
            <div className="flex flex-col gap-0.5 max-[1050px]:hidden">
              <strong className="text-xs">{operatorName}</strong>
              <span className="text-[0.7rem] text-muted-foreground">{role ?? "User"}</span>
            </div>
            <AccountMenu name={operatorName} role={role} onSignOut={handleSignOut} />
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

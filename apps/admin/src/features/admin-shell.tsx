import { Receipt, ShieldCheck, SquaresFour, Stack, UsersThree } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Avatar } from "@voidmix/ui/avatar";
import { Badge } from "@voidmix/ui/components/ui/badge";
import { Button } from "@voidmix/ui/components/ui/button";
import { Logo } from "@voidmix/ui/logo";
import { cn } from "@voidmix/ui/lib/utils";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <a className="sidebar-brand" href="/">
          <Logo label="Voidmix / Control" />
        </a>
        <nav aria-label="Admin navigation">
          <NavItem icon={<SquaresFour weight="regular" />} label="Overview" />
          <NavItem active icon={<UsersThree weight="regular" />} label="Users" count="2,416" />
          <NavItem icon={<Stack weight="regular" />} label="Workspaces" />
          <NavItem icon={<Receipt weight="regular" />} label="Billing" />
          <NavItem icon={<ShieldCheck weight="regular" />} label="Audit log" />
        </nav>
        <div className="sidebar-footer">
          <Badge variant="secondary">All systems normal</Badge>
          <div className="operator">
            <Avatar name="Zack Operator" size="small" />
            <div>
              <strong>Zack</strong>
              <span>Owner</span>
            </div>
            <Button
              aria-label="Open account menu"
              className="operator-menu"
              size="icon-sm"
              variant="ghost"
            >
              •••
            </Button>
          </div>
        </div>
      </aside>
      <section className="admin-main">
        <div aria-label="System status" className="control-strip">
          <span>
            <i aria-hidden="true" /> Production control online
          </span>
          <span>API latency 42 ms</span>
          <span>Last audit write 18 s ago</span>
        </div>
        {children}
      </section>
    </main>
  );
}

function NavItem({
  icon,
  label,
  count,
  active = false,
}: {
  icon: ReactNode;
  label: string;
  count?: string;
  active?: boolean;
}) {
  return (
    <a
      aria-current={active ? "page" : undefined}
      className={cn(active && "active")}
      href={active ? "/" : "#"}
    >
      <span>{icon}</span>
      {label}
      {count ? <small>{count}</small> : null}
    </a>
  );
}

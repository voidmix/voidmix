import { createFileRoute } from "@tanstack/react-router";
import {
  Export,
  MagnifyingGlass,
  Receipt,
  ShieldCheck,
  SlidersHorizontal,
  SquaresFour,
  Stack,
  UserPlus,
  UsersThree,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Avatar, Badge, BrandMark, Button } from "@voidmix/ui";
import { adminUsersClient, type AdminUser, type UserStatus } from "../features/users/client";
import { useAdminUsers } from "../features/users/use-admin-users";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const usersState = useAdminUsers(adminUsersClient);
  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <a className="sidebar-brand" href="/">
          <BrandMark label="Voidmix / Control" />
        </a>
        <nav aria-label="Admin navigation">
          <NavItem icon={<SquaresFour weight="regular" />} label="Overview" />
          <NavItem active icon={<UsersThree weight="regular" />} label="Users" count="2,416" />
          <NavItem icon={<Stack weight="regular" />} label="Workspaces" />
          <NavItem icon={<Receipt weight="regular" />} label="Billing" />
          <NavItem icon={<ShieldCheck weight="regular" />} label="Audit log" />
        </nav>
        <div className="sidebar-footer">
          <Badge tone="positive" withDot>
            All systems normal
          </Badge>
          <div className="operator">
            <Avatar name="Zack Operator" size="small" />
            <div>
              <strong>Zack</strong>
              <span>Owner</span>
            </div>
            <button aria-label="Open account menu" type="button">
              •••
            </button>
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
        <header className="admin-header">
          <div>
            <span>Control / User operations</span>
            <h1>User directory</h1>
            <p>Search accounts, review access, and act without losing the audit trail.</p>
          </div>
          <div className="header-actions">
            <Button variant="secondary">
              <Export weight="regular" /> Export
            </Button>
            <Button>
              <UserPlus weight="regular" /> Invite user
            </Button>
          </div>
        </header>
        <section aria-label="User metrics" className="metric-grid">
          <MetricCard change="+8.2%" detail="vs. last month" label="Total users" value="2,416" />
          <MetricCard change="+12.4%" detail="last 30 days" label="Active users" value="1,892" />
          <MetricCard
            change="24 waiting"
            detail="72% accepted"
            label="Pending invites"
            value="68"
          />
          <MetricCard
            change="0.8%"
            detail="within target"
            label="Suspension rate"
            value="19"
            warning
          />
        </section>
        <section className="directory-card">
          <div className="directory-toolbar">
            <div className="search-box">
              <MagnifyingGlass weight="regular" />
              <input
                aria-label="Search users"
                onChange={(event) => usersState.setQuery(event.currentTarget.value)}
                placeholder="Search name or email..."
                type="search"
                value={usersState.query}
              />
            </div>
            <div className="filters" aria-label="Filter by status">
              <FilterButton
                active={usersState.status === undefined}
                onClick={() => usersState.setStatus(undefined)}
              >
                All
              </FilterButton>
              <FilterButton
                active={usersState.status === "active"}
                onClick={() => usersState.setStatus("active")}
              >
                Active
              </FilterButton>
              <FilterButton
                active={usersState.status === "suspended"}
                onClick={() => usersState.setStatus("suspended")}
              >
                Suspended
              </FilterButton>
            </div>
            <button aria-label="More filters" className="filter-icon" type="button">
              <SlidersHorizontal weight="regular" />
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    <input aria-label="Select all users" type="checkbox" />
                  </th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last active</th>
                  <th>Joined</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {usersState.users.map((user) => (
                  <UserRow
                    key={user.id}
                    onToggle={() => void usersState.toggleSuspension(user)}
                    user={user}
                  />
                ))}
              </tbody>
            </table>
            {usersState.isLoading ? <p className="table-state">Loading directory…</p> : null}
            {!usersState.isLoading && usersState.users.length === 0 ? (
              <p className="table-state">No users match this view.</p>
            ) : null}
          </div>
          <footer className="table-footer">
            <span>Showing {usersState.users.length} of 2,416 users</span>
            <div>
              <button disabled type="button">
                Previous
              </button>
              <button type="button">Next</button>
            </div>
          </footer>
        </section>
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
      className={active ? "active" : ""}
      href={active ? "/" : "#"}
    >
      <span>{icon}</span>
      {label}
      {count ? <small>{count}</small> : null}
    </a>
  );
}
function MetricCard({
  label,
  value,
  change,
  detail,
  warning = false,
}: {
  label: string;
  value: string;
  change: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <article className="metric-card">
      <div>
        <span>{label}</span>
        <button aria-label={`More options for ${label}`} type="button">
          •••
        </button>
      </div>
      <strong>{value}</strong>
      <p className={warning ? "warning" : ""}>
        {change} <span>{detail}</span>
      </p>
    </article>
  );
}
function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={active ? "active" : ""}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
function UserRow({ user, onToggle }: { user: AdminUser; onToggle: () => void }) {
  const tone = statusTone(user.status);
  return (
    <tr>
      <td>
        <input aria-label={`Select ${user.name}`} type="checkbox" />
      </td>
      <td>
        <div className="user-cell">
          <Avatar name={user.name} />
          <div>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
        </div>
      </td>
      <td>
        <span className="role-label">{user.role}</span>
      </td>
      <td>
        <Badge tone={tone} withDot>
          {user.status}
        </Badge>
      </td>
      <td>{user.lastActive}</td>
      <td>{user.joinedAt}</td>
      <td>
        <button
          aria-label={`${user.status === "suspended" ? "Activate" : "Suspend"} ${user.name}`}
          className="row-action"
          disabled={user.role === "owner"}
          onClick={onToggle}
          type="button"
        >
          {user.status === "suspended" ? "Activate" : "•••"}
        </button>
      </td>
    </tr>
  );
}
function statusTone(status: UserStatus): "positive" | "neutral" {
  return status === "active" ? "positive" : "neutral";
}

import { useEffect, useState } from "react";

import { Button } from "@voidmix/ui/components/ui/button";

import { adminUsersClient, type AdminUsersClient } from "./client";
import { DirectoryToolbar } from "./directory-toolbar";
import { MetricGrid } from "./metric-grid";
import { useAdminUsers } from "./use-admin-users";
import { UserTable } from "./user-table";

export function UserDirectory({ client = adminUsersClient }: { client?: AdminUsersClient } = {}) {
  const usersState = useAdminUsers(client);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [usersState.query, usersState.role, usersState.status]);

  const selectedUsers = usersState.users.filter((user) => selectedIds.has(user.id));
  const actionableUsers = selectedUsers.filter((user) => user.role !== "owner");

  function setSelected(userId: string, selected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }

  function setAllSelected(selected: boolean) {
    setSelectedIds(selected ? new Set(usersState.users.map((user) => user.id)) : new Set());
  }

  async function toggleUser(user: (typeof usersState.users)[number]) {
    setNotice(null);
    setPendingIds((current) => new Set(current).add(user.id));
    try {
      const nextStatus = user.status === "suspended" ? "active" : "suspended";
      await usersState.toggleSuspension(user);
      setNotice(`${user.name} is now ${nextStatus}.`);
    } catch {
      setNotice(`Could not update ${user.name}. Try again.`);
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(user.id);
        return next;
      });
    }
  }

  async function updateSelected(status: "active" | "suspended") {
    if (actionableUsers.length === 0) {
      setNotice("The owner account cannot be changed.");
      return;
    }

    const targets = actionableUsers.filter((user) => user.status !== status);
    if (targets.length === 0) {
      setNotice(`Selected users are already ${status}.`);
      return;
    }

    setNotice(null);
    setPendingIds((current) => new Set([...current, ...targets.map((user) => user.id)]));
    const results = await Promise.allSettled(
      targets.map((user) => usersState.toggleSuspension(user)),
    );
    const succeeded = results.filter((result) => result.status === "fulfilled").length;
    const failed = results.length - succeeded;
    setPendingIds((current) => {
      const next = new Set(current);
      targets.forEach((user) => next.delete(user.id));
      return next;
    });
    setSelectedIds(new Set());
    setNotice(
      failed === 0
        ? `${succeeded} user${succeeded === 1 ? "" : "s"} updated to ${status}.`
        : `${succeeded} updated, ${failed} could not be changed.`,
    );
  }

  function exportVisibleUsers() {
    if (usersState.users.length === 0) {
      setNotice("There are no users in this view to export.");
      return;
    }

    const header = ["Name", "Email", "Role", "Status", "Last active", "Joined"];
    const rows = usersState.users.map((user) => [
      user.name,
      user.email,
      user.role,
      user.status,
      user.lastActive,
      user.joinedAt,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "voidmix-users.csv";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(
      `${usersState.users.length} user${usersState.users.length === 1 ? "" : "s"} exported.`,
    );
  }

  return (
    <>
      <MetricGrid isLoading={usersState.isLoading} users={usersState.users} />
      <section className="overflow-hidden rounded-xl border bg-card">
        <DirectoryToolbar
          onExport={exportVisibleUsers}
          query={usersState.query}
          role={usersState.role}
          setQuery={usersState.setQuery}
          setRole={usersState.setRole}
          setStatus={usersState.setStatus}
          status={usersState.status}
        />

        {selectedIds.size > 0 ? (
          <div className="flex min-h-12 flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-2">
            <span className="mr-auto text-xs font-medium">
              {selectedIds.size} selected
              {selectedUsers.some((user) => user.role === "owner") ? (
                <span className="ml-2 text-muted-foreground">Owner stays protected</span>
              ) : null}
            </span>
            <Button
              disabled={pendingIds.size > 0 || actionableUsers.length === 0}
              onClick={() => void updateSelected("suspended")}
              size="sm"
              variant="outline"
            >
              Suspend selected
            </Button>
            <Button
              disabled={pendingIds.size > 0 || actionableUsers.length === 0}
              onClick={() => void updateSelected("active")}
              size="sm"
              variant="outline"
            >
              Activate selected
            </Button>
            <Button onClick={() => setSelectedIds(new Set())} size="sm" variant="ghost">
              Clear
            </Button>
          </div>
        ) : null}

        {usersState.error ? (
          <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3 text-sm">
            <p className="m-0" role="alert">
              {usersState.error}
            </p>
            <Button onClick={usersState.retry} size="sm" variant="outline">
              Retry
            </Button>
          </div>
        ) : null}

        <UserTable
          isLoading={usersState.isLoading}
          onSelect={setSelected}
          onSelectAll={setAllSelected}
          onToggle={(user) => void toggleUser(user)}
          pendingIds={pendingIds}
          selectedIds={selectedIds}
          users={usersState.users}
        />
        <footer className="flex min-h-14 items-center justify-between gap-3 border-t px-4 font-mono text-[0.7rem] text-muted-foreground max-[480px]:items-start max-[480px]:py-3">
          <span>
            Showing {usersState.users.length} matching user
            {usersState.users.length === 1 ? "" : "s"}
          </span>
          <span className="text-right">Results are limited to the current view</span>
        </footer>
        {notice ? (
          <p aria-live="polite" className="m-0 border-t px-4 py-2 text-xs text-muted-foreground">
            {notice}
          </p>
        ) : null}
      </section>
    </>
  );
}

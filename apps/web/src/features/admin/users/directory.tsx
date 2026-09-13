import { useEffect, useState } from "react";

import { Button } from "@voidmix/ui/components/ui/button";
import { useFormatter, useTranslations } from "../../../i18n/client";

import { adminUsersClient, type AdminUsersClient } from "./client";
import { DirectoryToolbar } from "./directory-toolbar";
import { MetricGrid } from "./metric-grid";
import { useAdminUsers } from "./use-admin-users";
import { UserTable } from "./user-table";
import {
  formatAdminJoinedAt,
  formatAdminLastActive,
  formatAdminRole,
  formatAdminStatus,
} from "./display";

export function UserDirectory({ client = adminUsersClient }: { client?: AdminUsersClient } = {}) {
  const usersState = useAdminUsers(client);
  const t = useTranslations("admin");
  const formatter = useFormatter();
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
      setNotice(t("userStatusChanged", { name: user.name, status: nextStatus }));
    } catch {
      setNotice(t("userUpdateFailed", { name: user.name }));
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
      setNotice(t("ownerCannotChange"));
      return;
    }

    const targets = actionableUsers.filter((user) => user.status !== status);
    if (targets.length === 0) {
      setNotice(t("selectedAlready", { status }));
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
        ? t("usersUpdated", { count: succeeded, status })
        : t("usersPartiallyUpdated", { succeeded, failed }),
    );
  }

  function exportVisibleUsers() {
    if (usersState.users.length === 0) {
      setNotice(t("noUsersToExport"));
      return;
    }

    const header = [t("user"), t("email"), t("role"), t("status"), t("lastActive"), t("joined")];
    const rows = usersState.users.map((user) => [
      user.name,
      user.email,
      formatAdminRole(user.role, t),
      formatAdminStatus(user.status, t),
      formatAdminLastActive(user.lastActive, t, formatter),
      formatAdminJoinedAt(user.joinedAt, formatter, t("notAvailable")),
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
    setNotice(t("usersExported", { count: usersState.users.length }));
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
              {t("selectedCount", { count: selectedIds.size })}
              {selectedUsers.some((user) => user.role === "owner") ? (
                <span className="ml-2 text-muted-foreground">{t("ownerProtected")}</span>
              ) : null}
            </span>
            <Button
              disabled={pendingIds.size > 0 || actionableUsers.length === 0}
              onClick={() => void updateSelected("suspended")}
              size="sm"
              variant="outline"
            >
              {t("suspendSelected")}
            </Button>
            <Button
              disabled={pendingIds.size > 0 || actionableUsers.length === 0}
              onClick={() => void updateSelected("active")}
              size="sm"
              variant="outline"
            >
              {t("activateSelected")}
            </Button>
            <Button onClick={() => setSelectedIds(new Set())} size="sm" variant="ghost">
              {t("clear")}
            </Button>
          </div>
        ) : null}

        {usersState.error ? (
          <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3 text-sm">
            <p className="m-0" role="alert">
              {t(usersState.error)}
            </p>
            <Button onClick={usersState.retry} size="sm" variant="outline">
              {t("retry")}
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
          <span>{t("showingUsers", { count: usersState.users.length })}</span>
          <span className="text-right">{t("resultsLimited")}</span>
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

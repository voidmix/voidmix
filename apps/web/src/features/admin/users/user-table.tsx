import { useDirectoryStore, useDirectorySelector } from "./store-provider";
import { useEffect, useRef } from "react";

import type { AdminUser } from "./types";
import { UserRow } from "./user-row";
import { useTranslations } from "../../../i18n/client";

export function UserTable({
  users,
  isLoading,
  onToggle,
}: {
  users: readonly AdminUser[];
  isLoading: boolean;
  onToggle: (user: AdminUser) => void;
}) {
  const selectAllRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("admin");
  const store = useDirectoryStore();
  const selectedVisibleCount = useDirectorySelector(
    (state) => users.filter((user) => state.selectedIds.has(user.id)).length,
  );
  const allSelected = users.length > 0 && selectedVisibleCount === users.length;
  const someSelected = selectedVisibleCount > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  return (
    <div className="directory-table-wrap">
      <table className="directory-table w-full border-collapse">
        <thead className="bg-muted">
          <tr>
            <th className="w-11 border-b py-3 pr-4 pl-5 text-left text-xs font-semibold text-muted-foreground">
              <label className="directory-checkbox">
                <input
                  aria-label={t("selectAllUsers")}
                  checked={allSelected}
                  className="size-4 accent-primary"
                  onChange={(event) =>
                    store
                      .getState()
                      .selectAll(event.currentTarget.checked ? users.map((user) => user.id) : [])
                  }
                  ref={selectAllRef}
                  type="checkbox"
                />
              </label>
            </th>
            <TableHeading>{t("user")}</TableHeading>
            <TableHeading>{t("role")}</TableHeading>
            <TableHeading>{t("status")}</TableHeading>
            <TableHeading>{t("lastActive")}</TableHeading>
            <TableHeading>{t("joined")}</TableHeading>
            <TableHeading>
              <span className="sr-only">{t("actions")}</span>
            </TableHeading>
          </tr>
        </thead>
        <tbody className="[&_tr]:transition-colors [&_tr:hover]:bg-muted/40">
          {users.map((user) => (
            <UserRow key={user.id} onToggle={() => onToggle(user)} user={user} />
          ))}
        </tbody>
      </table>
      {isLoading ? (
        <p className="m-0 px-5 py-8 text-sm text-muted-foreground">{t("loadingDirectory")}</p>
      ) : null}
      {!isLoading && users.length === 0 ? (
        <p className="m-0 px-5 py-8 text-sm text-muted-foreground">{t("noUsers")}</p>
      ) : null}
    </div>
  );
}

function TableHeading({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
      {children}
    </th>
  );
}

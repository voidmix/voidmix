import { useDirectoryStore, useDirectorySelector } from "./store-provider";
import { Checkbox } from "@voidmix/ui/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
} from "@voidmix/ui/components/ui/table";

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
  const t = useTranslations("admin");
  const store = useDirectoryStore();
  const selectedVisibleCount = useDirectorySelector(
    (state) => users.filter((user) => state.selectedIds.has(user.id)).length,
  );
  const allSelected = users.length > 0 && selectedVisibleCount === users.length;
  const someSelected = selectedVisibleCount > 0 && !allSelected;

  return (
    <div className="directory-table-wrap">
      <Table className="directory-table">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 px-4">
              <label className="directory-checkbox">
                <Checkbox
                  aria-label={t("selectAllUsers")}
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={(checked) =>
                    store.getState().selectAll(checked ? users.map((user) => user.id) : [])
                  }
                />
              </label>
            </TableHead>
            <TableHeading>{t("user")}</TableHeading>
            <TableHeading>{t("role")}</TableHeading>
            <TableHeading>{t("status")}</TableHeading>
            <TableHeading>{t("lastActive")}</TableHeading>
            <TableHeading>{t("joined")}</TableHeading>
            <TableHeading>
              <span className="sr-only">{t("actions")}</span>
            </TableHeading>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <UserRow key={user.id} onToggle={() => onToggle(user)} user={user} />
          ))}
        </TableBody>
      </Table>
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
  return <TableHead className="px-4">{children}</TableHead>;
}

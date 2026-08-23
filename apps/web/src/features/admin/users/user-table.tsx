import type { AdminUser } from "./types";
import { UserRow } from "./user-row";

export function UserTable({
  users,
  isLoading,
  onToggle,
}: {
  users: readonly AdminUser[];
  isLoading: boolean;
  onToggle: (user: AdminUser) => void;
}) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[52rem] border-collapse">
        <thead className="bg-muted/40">
          <tr>
            <th className="w-11 border-b py-3 pr-4 pl-5 text-left font-mono text-[0.65rem] font-semibold text-muted-foreground uppercase">
              <input
                aria-label="Select all users"
                className="size-3.5 accent-primary"
                type="checkbox"
              />
            </th>
            <TableHeading>User</TableHeading>
            <TableHeading>Role</TableHeading>
            <TableHeading>Status</TableHeading>
            <TableHeading>Last active</TableHeading>
            <TableHeading>Joined</TableHeading>
            <TableHeading>
              <span className="sr-only">Actions</span>
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
        <p className="m-0 px-5 py-8 text-sm text-muted-foreground">Loading directory…</p>
      ) : null}
      {!isLoading && users.length === 0 ? (
        <p className="m-0 px-5 py-8 text-sm text-muted-foreground">No users match this view.</p>
      ) : null}
    </div>
  );
}

function TableHeading({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b px-4 py-3 text-left font-mono text-[0.65rem] font-semibold text-muted-foreground uppercase">
      {children}
    </th>
  );
}

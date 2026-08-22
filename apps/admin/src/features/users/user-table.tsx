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
          {users.map((user) => (
            <UserRow key={user.id} onToggle={() => onToggle(user)} user={user} />
          ))}
        </tbody>
      </table>
      {isLoading ? <p className="table-state">Loading directory…</p> : null}
      {!isLoading && users.length === 0 ? (
        <p className="table-state">No users match this view.</p>
      ) : null}
    </div>
  );
}

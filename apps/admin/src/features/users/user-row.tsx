import { Avatar } from "@voidmix/ui/avatar";
import { Badge } from "@voidmix/ui/components/ui/badge";
import { Button } from "@voidmix/ui/components/ui/button";
import type { AdminUser, UserStatus } from "./types";

export function UserRow({ user, onToggle }: { user: AdminUser; onToggle: () => void }) {
  const tone = statusTone(user.status);
  const actionLabel = user.status === "suspended" ? "Activate" : "Suspend";
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
        <Badge variant={tone}>{user.status}</Badge>
      </td>
      <td>{user.lastActive}</td>
      <td>{user.joinedAt}</td>
      <td>
        <Button
          aria-label={`${actionLabel} ${user.name}`}
          className="row-action"
          disabled={user.role === "owner"}
          onClick={onToggle}
          size={user.status === "suspended" ? "sm" : "icon-sm"}
          variant="ghost"
        >
          {user.status === "suspended" ? actionLabel : "•••"}
        </Button>
      </td>
    </tr>
  );
}

function statusTone(status: UserStatus): "secondary" | "destructive" {
  return status === "active" ? "secondary" : "destructive";
}

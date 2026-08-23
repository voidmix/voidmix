import { Avatar } from "@voidmix/ui/avatar";
import { Badge } from "@voidmix/ui/components/ui/badge";
import { Button } from "@voidmix/ui/components/ui/button";
import type { AdminUser, UserStatus } from "./types";

export function UserRow({ user, onToggle }: { user: AdminUser; onToggle: () => void }) {
  const tone = statusTone(user.status);
  const actionLabel = user.status === "suspended" ? "Activate" : "Suspend";
  return (
    <tr>
      <td className="w-11 border-b py-3 pr-4 pl-5 text-sm text-muted-foreground">
        <input
          aria-label={`Select ${user.name}`}
          className="size-3.5 accent-primary"
          type="checkbox"
        />
      </td>
      <td className="border-b px-4 py-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} />
          <div className="flex flex-col gap-0.5">
            <strong className="text-sm text-foreground">{user.name}</strong>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </div>
      </td>
      <td className="border-b px-4 py-3 text-sm text-muted-foreground">
        <span className="capitalize">{user.role}</span>
      </td>
      <td className="border-b px-4 py-3 text-sm text-muted-foreground">
        <Badge variant={tone}>{user.status}</Badge>
      </td>
      <td className="border-b px-4 py-3 text-sm text-muted-foreground">{user.lastActive}</td>
      <td className="border-b px-4 py-3 text-sm text-muted-foreground">{user.joinedAt}</td>
      <td className="border-b px-4 py-3 text-sm text-muted-foreground">
        <Button
          aria-label={`${actionLabel} ${user.name}`}
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

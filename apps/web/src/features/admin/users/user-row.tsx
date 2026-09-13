import { Avatar } from "@voidmix/ui/avatar";
import { Badge } from "@voidmix/ui/components/ui/badge";
import { Button } from "@voidmix/ui/components/ui/button";
import type { AdminUser, UserStatus } from "./types";
import { useFormatter, useTranslations } from "../../../i18n/client";
import {
  formatAdminJoinedAt,
  formatAdminLastActive,
  formatAdminRole,
  formatAdminStatus,
} from "./display";

export function UserRow({
  user,
  onToggle,
  selected,
  onSelect,
  isPending,
}: {
  user: AdminUser;
  onToggle: () => void;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  isPending: boolean;
}) {
  const tone = statusTone(user.status);
  const t = useTranslations("admin");
  const formatter = useFormatter();
  const actionLabel = user.status === "suspended" ? t("activate") : t("suspend");
  const isOwner = user.role === "owner";
  return (
    <tr>
      <td className="w-11 border-b py-3 pr-4 pl-5 text-sm text-muted-foreground">
        <input
          aria-label={`${t("selectUser")} ${user.name}`}
          checked={selected}
          className="size-3.5 accent-primary"
          onChange={(event) => onSelect(event.currentTarget.checked)}
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
        <span>{formatAdminRole(user.role, t)}</span>
      </td>
      <td className="border-b px-4 py-3 text-sm text-muted-foreground">
        <Badge variant={tone}>{formatAdminStatus(user.status, t)}</Badge>
      </td>
      <td className="border-b px-4 py-3 text-sm text-muted-foreground">
        {formatAdminLastActive(user.lastActive, t, formatter)}
      </td>
      <td className="border-b px-4 py-3 text-sm text-muted-foreground">
        {formatAdminJoinedAt(user.joinedAt, formatter, t("notAvailable"))}
      </td>
      <td className="border-b px-4 py-3 text-sm text-muted-foreground">
        <Button
          aria-label={`${actionLabel} ${user.name}`}
          disabled={isOwner || isPending}
          onClick={onToggle}
          title={isOwner ? t("ownerCannotSuspend") : undefined}
          size="sm"
          variant="ghost"
        >
          {isPending ? t("saving") : actionLabel}
        </Button>
      </td>
    </tr>
  );
}

function statusTone(status: UserStatus): "secondary" | "destructive" {
  return status === "active" ? "secondary" : "destructive";
}

import { useFormatter, useTranslations } from "../../../i18n/client";
import type { ActivityView } from "../types";
import { displayActivityTitle } from "../preview-copy";

export function ActivityList({ items }: { items: ActivityView[] }) {
  const t = useTranslations("workspaceUi");
  const formatter = useFormatter();
  if (!items.length) return <p className="py-6 text-sm text-muted-foreground">{t("noActivity")}</p>;
  return (
    <ol className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 py-4 text-sm">
          <span className="mt-1 text-xs text-muted-foreground" aria-hidden="true">
            ↳
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate">{displayActivityTitle(item, t)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(item.action === "updated" ? "updatedAction" : item.action)}
            </p>
          </div>
          <time dateTime={item.at.toISOString()} className="shrink-0 text-xs text-muted-foreground">
            {formatter.dateTime(item.at, { month: "short", day: "numeric" })}
          </time>
        </li>
      ))}
    </ol>
  );
}

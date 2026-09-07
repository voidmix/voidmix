import { useLocale, useTranslations } from "@voidmix/i18n/client";
import type { ActivityView } from "../types";

export function ActivityList({ items }: { items: ActivityView[] }) {
  const t = useTranslations("workspaceUi");
  const locale = useLocale();
  if (!items.length) return <p className="py-6 text-sm text-muted-foreground">{t("noActivity")}</p>;
  return (
    <ol className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 py-4 text-sm">
          <span className="mt-1 text-xs text-muted-foreground" aria-hidden="true">
            ↳
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate">{item.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(item.action === "updated" ? "updatedAction" : item.action)}
            </p>
          </div>
          <time dateTime={item.at.toISOString()} className="shrink-0 text-xs text-muted-foreground">
            {item.at.toLocaleDateString(locale, { month: "short", day: "numeric" })}
          </time>
        </li>
      ))}
    </ol>
  );
}

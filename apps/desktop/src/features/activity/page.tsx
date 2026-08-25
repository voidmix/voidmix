import {
  ArrowDown,
  Database,
  DeviceMobile,
  DotsThree,
  Folder,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Button } from "@voidmix/ui/components/ui/button";
import { cn } from "@voidmix/ui/lib/utils";
import { useTranslations } from "@voidmix/i18n/client";
import { useState } from "react";
import { loadActivityMessages } from "../../i18n/activity";

const activityRows = [
  {
    title: "Campaign exports",
    detail: "Uploaded 18 files from Mac Studio",
    time: "2 min",
    icon: Folder,
    tone: "blue",
  },
  {
    title: "Brand archive",
    detail: "Created encrypted backup snapshot",
    time: "24 min",
    icon: ShieldCheck,
    tone: "green",
  },
  {
    title: "Product research",
    detail: "Downloaded 4 files to Surface Laptop",
    time: "1 hr",
    icon: ArrowDown,
    tone: "violet",
  },
  {
    title: "Design system",
    detail: "Indexed 328 changed objects",
    time: "3 hr",
    icon: Database,
    tone: "gray",
  },
  {
    title: "Team photos",
    detail: "Uploaded from Alex’s iPhone",
    time: "Yesterday",
    icon: DeviceMobile,
    tone: "blue",
  },
] as const;

const filters = ["all", "uploads", "downloads", "backups"] as const;

export function ActivityPage() {
  const t = useTranslations("activity", loadActivityMessages);
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("description")}</p>
        </div>
        <Button className="secondary-button" variant="secondary">
          {t("exportLog")}
        </Button>
      </header>
      <div className="filter-row" role="toolbar" aria-label={t("filters")}>
        {filters.map((item) => (
          <Button
            className={cn("filter-chip", filter === item && "active")}
            variant="ghost"
            key={item}
            onClick={() => setFilter(item)}
          >
            {t(item)}
          </Button>
        ))}
      </div>
      <section className="activity-panel" aria-label={t("recent")}>
        <div className="activity-date">{t("today")}</div>
        {activityRows.map(({ title, detail, time, icon: Icon, tone }) => (
          <article className="activity-row" key={title}>
            <span className={cn("activity-icon", tone)}>
              <Icon size={16} />
            </span>
            <div>
              <strong>{title}</strong>
              <span>{detail}</span>
            </div>
            <time>{time}</time>
            <Button
              className="icon-button"
              size="icon"
              variant="ghost"
              aria-label={t("moreOptions", { title })}
            >
              <DotsThree size={16} />
            </Button>
          </article>
        ))}
      </section>
    </div>
  );
}

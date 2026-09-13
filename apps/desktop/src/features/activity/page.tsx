import {
  ArrowDown,
  Database,
  DeviceMobile,
  DotsThree,
  Folder,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Button } from "@voidmix/ui/components/ui/button";
import { PageHeader } from "@voidmix/ui/page-header";
import { cn } from "@voidmix/ui/lib/utils";
import { useDesktopTranslations, useFormatter } from "../../i18n/client";
import { formatActivityTime } from "./time";
import { useState } from "react";

type ActivityRow = {
  title: "campaignExports" | "brandArchive" | "productResearch" | "designSystem" | "teamPhotos";
  detail:
    | "campaignExportsDetail"
    | "brandArchiveDetail"
    | "productResearchDetail"
    | "designSystemDetail"
    | "teamPhotosDetail";
  count?: number;
  device?: string;
  minutesAgo?: number;
  hoursAgo?: number;
  yesterday?: boolean;
  icon: typeof Folder;
  tone: string;
};

const activityRows: ActivityRow[] = [
  {
    title: "campaignExports",
    detail: "campaignExportsDetail",
    count: 18,
    device: "Mac Studio",
    minutesAgo: 2,
    icon: Folder,
    tone: "blue",
  },
  {
    title: "brandArchive",
    detail: "brandArchiveDetail",
    minutesAgo: 24,
    icon: ShieldCheck,
    tone: "green",
  },
  {
    title: "productResearch",
    detail: "productResearchDetail",
    count: 4,
    device: "Surface Laptop",
    hoursAgo: 1,
    icon: ArrowDown,
    tone: "violet",
  },
  {
    title: "designSystem",
    detail: "designSystemDetail",
    count: 328,
    hoursAgo: 3,
    icon: Database,
    tone: "gray",
  },
  {
    title: "teamPhotos",
    detail: "teamPhotosDetail",
    device: "Alex's iPhone",
    yesterday: true,
    icon: DeviceMobile,
    tone: "blue",
  },
];

const filters = ["all", "uploads", "downloads", "backups"] as const;

export function ActivityPage() {
  const t = useDesktopTranslations("activity");
  const formatter = useFormatter();
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");

  return (
    <div className="page">
      <PageHeader
        className="page-header"
        title={t("title")}
        description={t("description")}
        action={
          <Button className="secondary-button" variant="secondary">
            {t("exportLog")}
          </Button>
        }
      />
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
        {activityRows.map(
          ({ title, detail, icon: Icon, tone, count, device, minutesAgo, hoursAgo, yesterday }) => (
            <article className="activity-row" key={title}>
              <span className={cn("activity-icon", tone)}>
                <Icon size={16} />
              </span>
              <div>
                <strong>{t(title)}</strong>
                <span>
                  {t(detail, {
                    ...(count !== undefined ? { count } : {}),
                    ...(device ? { device } : {}),
                  })}
                </span>
              </div>
              <time>
                {formatActivityTime(
                  formatter,
                  {
                    ...(minutesAgo !== undefined ? { minutesAgo } : {}),
                    ...(hoursAgo !== undefined ? { hoursAgo } : {}),
                    ...(yesterday !== undefined ? { yesterday } : {}),
                  },
                  t("yesterday"),
                )}
              </time>
              <Button
                className="icon-button"
                size="icon"
                variant="ghost"
                aria-label={t("moreOptions", { title: t(title) })}
              >
                <DotsThree size={16} />
              </Button>
            </article>
          ),
        )}
      </section>
    </div>
  );
}

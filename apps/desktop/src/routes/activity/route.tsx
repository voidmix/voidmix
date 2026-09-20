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
import { createFileRoute } from "@tanstack/react-router";
import { useDesktopTranslations, useFormatter } from "../../i18n/client";
import { formatActivityTime } from "./-time";

export const Route = createFileRoute("/activity")({
  validateSearch: (search: Record<string, unknown>) => ({
    filter:
      search.filter === "uploads" || search.filter === "downloads" || search.filter === "backups"
        ? search.filter
        : ("all" as const),
  }),
  component: ActivityPage,
});

type ActivityRow = {
  category: "uploads" | "downloads" | "backups" | "index";
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
    category: "uploads",
    detail: "campaignExportsDetail",
    count: 18,
    device: "Mac Studio",
    minutesAgo: 2,
    icon: Folder,
    tone: "blue",
  },
  {
    title: "brandArchive",
    category: "backups",
    detail: "brandArchiveDetail",
    minutesAgo: 24,
    icon: ShieldCheck,
    tone: "green",
  },
  {
    title: "productResearch",
    category: "downloads",
    detail: "productResearchDetail",
    count: 4,
    device: "Surface Laptop",
    hoursAgo: 1,
    icon: ArrowDown,
    tone: "violet",
  },
  {
    title: "designSystem",
    category: "index",
    detail: "designSystemDetail",
    count: 328,
    hoursAgo: 3,
    icon: Database,
    tone: "gray",
  },
  {
    title: "teamPhotos",
    category: "uploads",
    detail: "teamPhotosDetail",
    device: "Alex's iPhone",
    yesterday: true,
    icon: DeviceMobile,
    tone: "blue",
  },
];

const filters = ["all", "uploads", "downloads", "backups"] as const;

function ActivityPage() {
  const t = useDesktopTranslations("activity");
  const formatter = useFormatter();
  const { filter } = Route.useSearch();
  const navigate = Route.useNavigate();
  const rows = activityRows.filter((row) => filter === "all" || row.category === filter);

  return (
    <div className="page">
      <PageHeader
        className="mb-7"
        title={t("title")}
        description={t("description")}
        action={<Button variant="secondary">{t("exportLog")}</Button>}
      />
      <div className="filter-row" role="toolbar" aria-label={t("filters")}>
        {filters.map((item) => (
          <Button
            className={cn("filter-chip", filter === item && "active")}
            variant="ghost"
            key={item}
            aria-pressed={filter === item}
            onClick={() => void navigate({ search: { filter: item } })}
          >
            {t(item)}
          </Button>
        ))}
      </div>
      <section className="activity-panel" aria-label={t("recent")}>
        <div className="activity-date">{t("today")}</div>
        {rows.map(
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

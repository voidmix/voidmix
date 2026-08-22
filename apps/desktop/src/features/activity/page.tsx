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
import { useState } from "react";

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

const filters = ["All activity", "Uploads", "Downloads", "Backups"] as const;

export function ActivityPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All activity");

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Activity</h1>
          <p>A chronological record of transfers, backups, and device changes.</p>
        </div>
        <Button className="secondary-button" variant="secondary">
          Export log
        </Button>
      </header>
      <div className="filter-row" role="toolbar" aria-label="Activity filters">
        {filters.map((item) => (
          <Button
            className={cn("filter-chip", filter === item && "active")}
            variant="ghost"
            key={item}
            onClick={() => setFilter(item)}
          >
            {item}
          </Button>
        ))}
      </div>
      <section className="activity-panel" aria-label="Recent activity">
        <div className="activity-date">Today</div>
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
              aria-label={`More options for ${title}`}
            >
              <DotsThree size={16} />
            </Button>
          </article>
        ))}
      </section>
    </div>
  );
}

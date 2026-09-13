import {
  ArrowDown,
  ArrowsClockwise,
  CaretRight,
  Check,
  Cloud,
  Database,
  DeviceMobile,
  DotsThree,
  Folder,
  Laptop,
  Monitor,
  Pause,
  Play,
  WifiHigh,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useDesktopTranslations, useFormatter } from "../../i18n/client";
import { formatCloudTime } from "../../i18n/time";
import { formatJobDetail } from "./job-detail";
import { Button } from "@voidmix/ui/components/ui/button";
import { PageHeader } from "@voidmix/ui/page-header";
import { SectionHeading } from "@voidmix/ui/section-heading";
import { cn } from "@voidmix/ui/lib/utils";
import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  demoCloudSnapshot,
  formatBytes,
  loadCloudSnapshot,
  type CloudSnapshot,
  type SyncJob,
} from "../../lib/cloud";

function SyncState({ paused, pending }: { paused: boolean; pending: number }) {
  const t = useDesktopTranslations("overview");
  return (
    <span className={paused ? "sync-state paused" : "sync-state"}>
      <span className="sync-indicator" />
      {paused
        ? t("syncPaused")
        : pending > 0
          ? t("syncingItems", { count: pending })
          : t("everythingSynced")}
    </span>
  );
}

function MetricRow({ snapshot }: { snapshot: CloudSnapshot }) {
  const t = useDesktopTranslations("overview");
  const formatter = useFormatter();
  const metrics = [
    {
      label: t("cloudStorage"),
      value: formatBytes(snapshot.storage.used, formatter),
      detail: t("ofTotal", { total: formatBytes(snapshot.storage.total, formatter) }),
    },
    {
      label: t("filesIndexed"),
      value: formatter.number(snapshot.fileCount),
      detail: t("newThisWeek", { count: snapshot.newThisWeek }),
    },
    {
      label: t("activeDevices"),
      value: formatter.number(snapshot.devices.filter((device) => device.online).length),
      detail: t("registeredCount", { count: snapshot.devices.length }),
    },
    {
      label: t("lastBackup"),
      value: formatCloudTime(formatter, snapshot.lastBackup),
      detail: t("encryptedSnapshot"),
    },
  ];

  return (
    <dl className="metric-row">
      {metrics.map((metric) => (
        <div key={metric.label}>
          <dt>{metric.label}</dt>
          <dd>{metric.value}</dd>
          <span>{metric.detail}</span>
        </div>
      ))}
    </dl>
  );
}

function JobIcon({ job }: { job: SyncJob }) {
  if (job.kind === "download") return <ArrowDown size={16} />;
  if (job.kind === "index") return <Database size={16} />;
  return <Folder size={16} />;
}

function SyncQueue({ jobs }: { jobs: SyncJob[] }) {
  const t = useDesktopTranslations("overview");
  const activityT = useDesktopTranslations("activity");
  const formatter = useFormatter();
  return (
    <section className="work-panel queue-panel" aria-labelledby="queue-title">
      <SectionHeading
        className="section-heading"
        title={t("transferQueue")}
        titleId="queue-title"
        description={t("queueDescription")}
        action={
          <Button className="quiet-button" variant="ghost">
            {t("viewActivity")} <CaretRight size={14} />
          </Button>
        }
      />
      <div className="queue-list">
        {jobs.map((job) => (
          <div className="queue-item" key={job.id}>
            <span className={cn("job-icon", job.status)}>
              {job.status === "complete" ? <Check size={16} /> : <JobIcon job={job} />}
            </span>
            <div className="job-copy">
              <strong>{job.nameKey ? activityT(job.nameKey) : job.name}</strong>
              <span>{formatJobDetail(job.detail, t, formatter)}</span>
            </div>
            <div
              className="job-progress"
              aria-label={t("percentComplete", { percent: job.progress })}
            >
              <span style={{ transform: `scaleX(${job.progress / 100})`, width: "100%" }} />
            </div>
            <span className={cn("job-status", job.status)}>
              {job.status === "complete"
                ? t("done")
                : t("percentComplete", { percent: job.progress })}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function StoragePanel({ snapshot }: { snapshot: CloudSnapshot }) {
  const t = useDesktopTranslations("overview");
  const formatter = useFormatter();
  const usedPercent = Math.round((snapshot.storage.used / snapshot.storage.total) * 100);
  const categories = [
    { label: t("projectFiles"), value: snapshot.storage.projects, tone: "primary" },
    { label: t("media"), value: snapshot.storage.media, tone: "accent" },
    { label: t("archives"), value: snapshot.storage.archives, tone: "muted" },
  ];

  return (
    <section className="work-panel storage-panel" aria-labelledby="storage-title">
      <SectionHeading
        className="section-heading"
        title={t("storage")}
        titleId="storage-title"
        description={t("storageDescription", { percent: usedPercent })}
        action={
          <Button
            className="icon-button"
            size="icon"
            variant="ghost"
            aria-label={t("storageOptions")}
          >
            <DotsThree size={16} />
          </Button>
        }
      />
      <div className="storage-total">
        <div
          className="storage-ring"
          style={{ "--storage-used": `${usedPercent * 3.6}deg` } as CSSProperties}
        >
          <span>{usedPercent}%</span>
        </div>
        <div>
          <strong>{formatBytes(snapshot.storage.used, formatter)}</strong>
          <span>{t("usedOf", { total: formatBytes(snapshot.storage.total, formatter) })}</span>
        </div>
      </div>
      <div className="storage-breakdown">
        {categories.map((category) => (
          <div key={category.label}>
            <span className={cn("storage-swatch", category.tone)} />
            <span>{category.label}</span>
            <strong>{formatBytes(category.value, formatter)}</strong>
          </div>
        ))}
      </div>
      <Button className="secondary-button full-width" variant="secondary">
        {t("manageStorage")}
      </Button>
    </section>
  );
}

function DeviceStrip({ snapshot }: { snapshot: CloudSnapshot }) {
  const t = useDesktopTranslations("overview");
  return (
    <section className="device-strip" aria-labelledby="device-title">
      <div>
        <span className="device-pulse" />
        <div>
          <h2 id="device-title">{t("deviceNetwork")}</h2>
          <p>
            {t("reachableDevices", {
              count: snapshot.devices.filter((device) => device.online).length,
            })}
          </p>
        </div>
      </div>
      <div className="device-avatars" aria-label={t("connectedDevices")}>
        {snapshot.devices.map((device) => (
          <span
            key={device.id}
            title={`${device.name}: ${device.online ? t("deviceOnline") : t("deviceOffline")}`}
          >
            {device.kind === "phone" ? (
              <DeviceMobile size={15} />
            ) : device.kind === "desktop" ? (
              <Monitor size={15} />
            ) : (
              <Laptop size={15} />
            )}
          </span>
        ))}
      </div>
      <Link to="/devices" className="quiet-link">
        {t("manageDevices")} <CaretRight size={14} />
      </Link>
    </section>
  );
}

export function OverviewPage() {
  const t = useDesktopTranslations("overview");
  const formatter = useFormatter();
  const [snapshot, setSnapshot] = useState<CloudSnapshot>(demoCloudSnapshot);
  const [source, setSource] = useState<"cloud" | "connected" | "demo">("demo");
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await loadCloudSnapshot();
    setSnapshot(result.snapshot);
    setSource(result.source);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="page overview-page">
      <PageHeader
        className="page-header"
        title={t("title")}
        description={t("description")}
        action={
          <div className="page-actions">
            <span className={cn("data-source", source)}>
              <WifiHigh size={13} />
              {source === "cloud"
                ? t("cloudData")
                : source === "connected"
                  ? t("apiOnline")
                  : t("previewData")}
            </span>
            <Button
              className="secondary-button"
              variant="secondary"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <ArrowsClockwise size={14} className={loading ? "rotating" : ""} />
              {t("refresh")}
            </Button>
            <Button
              className="primary-button"
              variant="primary"
              onClick={() => setPaused((value) => !value)}
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
              {paused ? t("resumeSync") : t("pauseSync")}
            </Button>
          </div>
        }
      />

      <section className="sync-banner">
        <div className="sync-orbit" aria-hidden="true">
          <Cloud size={22} />
          <span className="orbit-dot one" />
          <span className="orbit-dot two" />
        </div>
        <div>
          <SyncState paused={paused} pending={snapshot.pendingItems} />
          <p>{paused ? t("pausedDescription") : t("syncedDescription")}</p>
        </div>
        <span className="sync-time">
          {t("checked", { time: formatCloudTime(formatter, snapshot.lastChecked) })}
        </span>
      </section>

      <MetricRow snapshot={snapshot} />

      <div className="overview-grid">
        <SyncQueue jobs={snapshot.jobs} />
        <StoragePanel snapshot={snapshot} />
      </div>

      <DeviceStrip snapshot={snapshot} />
    </div>
  );
}

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
import { Button } from "@voidmix/ui/components/ui/button";
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
  return (
    <span className={paused ? "sync-state paused" : "sync-state"}>
      <span className="sync-indicator" />
      {paused ? "Sync paused" : pending > 0 ? `Syncing ${pending} items` : "Everything is synced"}
    </span>
  );
}

function MetricRow({ snapshot }: { snapshot: CloudSnapshot }) {
  const metrics = [
    {
      label: "Cloud storage",
      value: formatBytes(snapshot.storage.used),
      detail: `of ${formatBytes(snapshot.storage.total)}`,
    },
    {
      label: "Files indexed",
      value: snapshot.fileCount.toLocaleString(),
      detail: `${snapshot.newThisWeek} new this week`,
    },
    {
      label: "Active devices",
      value: String(snapshot.devices.filter((device) => device.online).length),
      detail: `${snapshot.devices.length} registered`,
    },
    { label: "Last backup", value: snapshot.lastBackup, detail: "Encrypted snapshot" },
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
  return (
    <section className="work-panel queue-panel" aria-labelledby="queue-title">
      <div className="section-heading">
        <div>
          <h2 id="queue-title">Transfer queue</h2>
          <p>Current work across this device and the cloud.</p>
        </div>
        <Button className="quiet-button" variant="ghost">
          View activity <CaretRight size={14} />
        </Button>
      </div>
      <div className="queue-list">
        {jobs.map((job) => (
          <div className="queue-item" key={job.id}>
            <span className={cn("job-icon", job.status)}>
              {job.status === "complete" ? <Check size={16} /> : <JobIcon job={job} />}
            </span>
            <div className="job-copy">
              <strong>{job.name}</strong>
              <span>{job.detail}</span>
            </div>
            <div className="job-progress" aria-label={`${job.progress}% complete`}>
              <span style={{ width: `${job.progress}%` }} />
            </div>
            <span className={cn("job-status", job.status)}>
              {job.status === "complete" ? "Done" : `${job.progress}%`}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function StoragePanel({ snapshot }: { snapshot: CloudSnapshot }) {
  const usedPercent = Math.round((snapshot.storage.used / snapshot.storage.total) * 100);
  const categories = [
    { label: "Project files", value: snapshot.storage.projects, tone: "primary" },
    { label: "Media", value: snapshot.storage.media, tone: "accent" },
    { label: "Archives", value: snapshot.storage.archives, tone: "muted" },
  ];

  return (
    <section className="work-panel storage-panel" aria-labelledby="storage-title">
      <div className="section-heading">
        <div>
          <h2 id="storage-title">Storage</h2>
          <p>{usedPercent}% of your team allocation is in use.</p>
        </div>
        <Button className="icon-button" size="icon" variant="ghost" aria-label="Storage options">
          <DotsThree size={16} />
        </Button>
      </div>
      <div className="storage-total">
        <div
          className="storage-ring"
          style={{ "--storage-used": `${usedPercent * 3.6}deg` } as CSSProperties}
        >
          <span>{usedPercent}%</span>
        </div>
        <div>
          <strong>{formatBytes(snapshot.storage.used)}</strong>
          <span>used of {formatBytes(snapshot.storage.total)}</span>
        </div>
      </div>
      <div className="storage-breakdown">
        {categories.map((category) => (
          <div key={category.label}>
            <span className={cn("storage-swatch", category.tone)} />
            <span>{category.label}</span>
            <strong>{formatBytes(category.value)}</strong>
          </div>
        ))}
      </div>
      <Button className="secondary-button full-width" variant="secondary">
        Manage storage
      </Button>
    </section>
  );
}

function DeviceStrip({ snapshot }: { snapshot: CloudSnapshot }) {
  return (
    <section className="device-strip" aria-labelledby="device-title">
      <div>
        <span className="device-pulse" />
        <div>
          <h2 id="device-title">Device network</h2>
          <p>
            {snapshot.devices.filter((device) => device.online).length} devices are reachable now
          </p>
        </div>
      </div>
      <div className="device-avatars" aria-label="Connected devices">
        {snapshot.devices.map((device) => (
          <span key={device.id} title={`${device.name}: ${device.online ? "online" : "offline"}`}>
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
        Manage devices <CaretRight size={14} />
      </Link>
    </section>
  );
}

export function OverviewPage() {
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
      <header className="page-header">
        <div>
          <h1>Workspace signal</h1>
          <p>Transfers, storage, and connected devices are operating normally.</p>
        </div>
        <div className="page-actions">
          <span className={cn("data-source", source)}>
            <WifiHigh size={13} />
            {source === "cloud"
              ? "Cloud data"
              : source === "connected"
                ? "API online"
                : "Preview data"}
          </span>
          <Button
            className="secondary-button"
            variant="secondary"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <ArrowsClockwise size={14} className={loading ? "rotating" : ""} />
            Refresh
          </Button>
          <Button
            className="primary-button"
            variant="primary"
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
            {paused ? "Resume sync" : "Pause sync"}
          </Button>
        </div>
      </header>

      <section className="sync-banner">
        <div className="sync-orbit" aria-hidden="true">
          <Cloud size={22} />
          <span className="orbit-dot one" />
          <span className="orbit-dot two" />
        </div>
        <div>
          <SyncState paused={paused} pending={snapshot.pendingItems} />
          <p>
            {paused
              ? "Transfers will remain queued until sync resumes."
              : "Desktop, cloud, and backup copies are up to date."}
          </p>
        </div>
        <span className="sync-time">Checked {snapshot.lastChecked}</span>
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

import {
  ArrowDown,
  ArrowsClockwise,
  Bell,
  Check,
  CaretRight,
  Cloud,
  Command,
  Database,
  DeviceMobile,
  DotsThree,
  Folder,
  Gear,
  Laptop,
  MagnifyingGlass,
  Monitor,
  Pause,
  Play,
  ShieldCheck,
  Sparkle,
  WifiHigh,
  X,
  Pulse,
} from "@phosphor-icons/react";
import { Link, Outlet } from "@tanstack/react-router";
import { Avatar, BrandMark } from "@voidmix/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  demoCloudSnapshot,
  formatBytes,
  loadCloudSnapshot,
  type CloudSnapshot,
  type SyncJob,
} from "./lib/cloud";
import { getDesktopRuntime, hideMainWindow, type DesktopRuntime } from "./lib/desktop";
import "@voidmix/ui/styles.css";
import "./App.css";

const navigation = [
  { to: "/", label: "Overview", icon: Cloud },
  { to: "/activity", label: "Activity", icon: Pulse },
  { to: "/devices", label: "Devices", icon: Laptop },
  { to: "/settings", label: "Settings", icon: Gear },
] as const;

function WindowActions() {
  const [message, setMessage] = useState("");

  async function handleHide() {
    const hidden = await hideMainWindow();
    if (!hidden) {
      setMessage("Tray controls are available in the desktop build.");
      window.setTimeout(() => setMessage(""), 2800);
    }
  }

  return (
    <div className="window-actions">
      {message ? <span className="window-message">{message}</span> : null}
      <button className="icon-button" type="button" aria-label="Notifications">
        <Bell size={16} weight="regular" />
        <span className="notification-dot" />
      </button>
      <button
        className="window-hide"
        type="button"
        onClick={() => void handleHide()}
        title="Hide Voidmix to the system tray"
      >
        Hide to tray
      </button>
    </div>
  );
}

export function DesktopShell() {
  const [runtime, setRuntime] = useState<DesktopRuntime>({
    appVersion: "0.1.0",
    platform: "browser",
    trayEnabled: false,
  });

  useEffect(() => {
    void getDesktopRuntime().then(setRuntime);
  }, []);

  return (
    <div className="desktop-shell">
      <aside className="sidebar">
        <div className="brand">
          <BrandMark />
          <span className="edition">Field</span>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="nav-label">Control</p>
          {navigation.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "nav-link active" }}
              inactiveProps={{ className: "nav-link" }}
            >
              <Icon size={16} weight="regular" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="workspace-switcher">
          <Avatar name="Acme Studio" size="small" />
          <span>
            <strong>Acme Studio</strong>
            <small>Team workspace</small>
          </span>
          <DotsThree size={16} aria-hidden="true" weight="regular" />
        </div>
        <div className="runtime-status">
          <span className={runtime.trayEnabled ? "runtime-dot ready" : "runtime-dot"} />
          <span>
            <strong>{runtime.trayEnabled ? "Desktop shell ready" : "Browser preview"}</strong>
            <small>
              v{runtime.appVersion} · {runtime.platform}
            </small>
          </span>
        </div>
      </aside>

      <div className="app-frame">
        <header className="titlebar" data-tauri-drag-region>
          <button className="search-trigger" type="button">
            <MagnifyingGlass size={15} weight="regular" />
            <span>Search workspace</span>
            <kbd>
              <Command size={11} />K
            </kbd>
          </button>
          <WindowActions />
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

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
        <button className="quiet-button" type="button">
          View activity <CaretRight size={14} />
        </button>
      </div>
      <div className="queue-list">
        {jobs.map((job) => (
          <div className="queue-item" key={job.id}>
            <span className={`job-icon ${job.status}`}>
              {job.status === "complete" ? <Check size={16} /> : <JobIcon job={job} />}
            </span>
            <div className="job-copy">
              <strong>{job.name}</strong>
              <span>{job.detail}</span>
            </div>
            <div className="job-progress" aria-label={`${job.progress}% complete`}>
              <span style={{ width: `${job.progress}%` }} />
            </div>
            <span className={`job-status ${job.status}`}>
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
        <button className="icon-button" type="button" aria-label="Storage options">
          <DotsThree size={16} />
        </button>
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
            <span className={`storage-swatch ${category.tone}`} />
            <span>{category.label}</span>
            <strong>{formatBytes(category.value)}</strong>
          </div>
        ))}
      </div>
      <button className="secondary-button full-width" type="button">
        Manage storage
      </button>
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
          <span className={`data-source ${source}`}>
            <WifiHigh size={13} />
            {source === "cloud"
              ? "Cloud data"
              : source === "connected"
                ? "API online"
                : "Preview data"}
          </span>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <ArrowsClockwise size={14} className={loading ? "rotating" : ""} />
            Refresh
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
            {paused ? "Resume sync" : "Pause sync"}
          </button>
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
];

export function ActivityPage() {
  const [filter, setFilter] = useState("All activity");
  const filters = ["All activity", "Uploads", "Downloads", "Backups"];

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Activity</h1>
          <p>A chronological record of transfers, backups, and device changes.</p>
        </div>
        <button className="secondary-button" type="button">
          Export log
        </button>
      </header>
      <div className="filter-row" role="toolbar" aria-label="Activity filters">
        {filters.map((item) => (
          <button
            className={filter === item ? "filter-chip active" : "filter-chip"}
            type="button"
            key={item}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <section className="activity-panel" aria-label="Recent activity">
        <div className="activity-date">Today</div>
        {activityRows.map(({ title, detail, time, icon: Icon, tone }) => (
          <article className="activity-row" key={title}>
            <span className={`activity-icon ${tone}`}>
              <Icon size={16} />
            </span>
            <div>
              <strong>{title}</strong>
              <span>{detail}</span>
            </div>
            <time>{time}</time>
            <button className="icon-button" type="button" aria-label={`More options for ${title}`}>
              <DotsThree size={16} />
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}

export function DevicesPage() {
  const devices = demoCloudSnapshot.devices;
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Devices</h1>
          <p>Control which computers and phones can access this workspace.</p>
        </div>
        <button className="primary-button" type="button">
          <Sparkle size={14} /> Pair device
        </button>
      </header>
      <section className="device-list" aria-label="Registered devices">
        {devices.map((device) => {
          const Icon =
            device.kind === "phone" ? DeviceMobile : device.kind === "desktop" ? Monitor : Laptop;
          return (
            <article className="device-row" key={device.id}>
              <span className="device-icon">
                <Icon size={20} />
              </span>
              <div className="device-name">
                <strong>{device.name}</strong>
                <span>{device.platform}</span>
              </div>
              <div>
                <span className={device.online ? "presence online" : "presence"}>
                  {device.online ? "Online" : "Offline"}
                </span>
              </div>
              <div className="device-meta">
                <span>Last seen</span>
                <strong>{device.lastSeen}</strong>
              </div>
              <div className="device-meta">
                <span>Synced</span>
                <strong>{device.synced}</strong>
              </div>
              <button className="icon-button" type="button" aria-label={`Remove ${device.name}`}>
                <X size={16} />
              </button>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function SettingToggle({
  label,
  description,
  initial = true,
}: {
  label: string;
  description: string;
  initial?: boolean;
}) {
  const [enabled, setEnabled] = useState(initial);
  return (
    <div className="setting-row">
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
      </div>
      <button
        className={enabled ? "toggle enabled" : "toggle"}
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled((value) => !value)}
      >
        <span />
      </button>
    </div>
  );
}

export function SettingsPage() {
  const sections = useMemo(
    () => [
      {
        title: "Sync behavior",
        settings: [
          [
            "Start with the system",
            "Keep Voidmix ready after you sign in to this computer.",
            false,
          ] as const,
          [
            "Sync on metered networks",
            "Continue transfers when your connection has a data limit.",
            false,
          ] as const,
          [
            "Download new files automatically",
            "Keep a local copy of files added by teammates.",
            true,
          ] as const,
        ],
      },
      {
        title: "Notifications",
        settings: [
          [
            "Transfer summaries",
            "Notify me when a large upload or download completes.",
            true,
          ] as const,
          [
            "Workspace changes",
            "Show desktop notices for device and access changes.",
            true,
          ] as const,
        ],
      },
    ],
    [],
  );

  return (
    <div className="page settings-page">
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Choose how Voidmix behaves on this computer.</p>
        </div>
      </header>
      {sections.map((section) => (
        <section className="settings-section" key={section.title}>
          <h2>{section.title}</h2>
          <div className="settings-list">
            {section.settings.map(([label, description, initial]) => (
              <SettingToggle
                key={label}
                label={label}
                description={description}
                initial={initial}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

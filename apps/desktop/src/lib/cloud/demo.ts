import type { CloudSnapshot } from "./types";

const gibibyte = 1024 ** 3;

export const demoCloudSnapshot: CloudSnapshot = {
  lastChecked: "just now",
  lastBackup: "8 min ago",
  pendingItems: 2,
  fileCount: 12_846,
  newThisWeek: 184,
  storage: {
    used: 81.4 * gibibyte,
    total: 200 * gibibyte,
    projects: 42.8 * gibibyte,
    media: 27.3 * gibibyte,
    archives: 11.3 * gibibyte,
  },
  jobs: [
    {
      id: "job_1",
      name: "Campaign exports",
      detail: "18 files · 1.8 GB",
      kind: "upload",
      status: "active",
      progress: 72,
    },
    {
      id: "job_2",
      name: "Product research",
      detail: "4 files · 680 MB",
      kind: "download",
      status: "active",
      progress: 38,
    },
    {
      id: "job_3",
      name: "Design system",
      detail: "328 objects indexed",
      kind: "index",
      status: "complete",
      progress: 100,
    },
  ],
  devices: [
    {
      id: "dev_1",
      name: "Mac Studio",
      platform: "macOS 16.0",
      kind: "desktop",
      online: true,
      lastSeen: "Now",
      synced: "48.2 GB",
    },
    {
      id: "dev_2",
      name: "Surface Laptop",
      platform: "Windows 12",
      kind: "laptop",
      online: true,
      lastSeen: "Now",
      synced: "31.7 GB",
    },
    {
      id: "dev_3",
      name: "Alex’s iPhone",
      platform: "iOS 20",
      kind: "phone",
      online: false,
      lastSeen: "2 hr ago",
      synced: "1.5 GB",
    },
  ],
};

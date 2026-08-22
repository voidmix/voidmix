export interface SyncJob {
  id: string;
  name: string;
  detail: string;
  kind: "upload" | "download" | "index";
  status: "active" | "queued" | "complete";
  progress: number;
}

export interface CloudDevice {
  id: string;
  name: string;
  platform: string;
  kind: "desktop" | "laptop" | "phone";
  online: boolean;
  lastSeen: string;
  synced: string;
}

export interface CloudSnapshot {
  lastChecked: string;
  lastBackup: string;
  pendingItems: number;
  fileCount: number;
  newThisWeek: number;
  storage: {
    used: number;
    total: number;
    projects: number;
    media: number;
    archives: number;
  };
  jobs: SyncJob[];
  devices: CloudDevice[];
}

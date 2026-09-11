/** Durable outbox for local Pi progress metadata. Payloads are metadata only; files stay local until an authenticated sync adapter uploads them. */
export type SyncOutboxStatus = "pending" | "sending" | "failed";
export interface SyncOutboxItem<T = unknown> {
  id: string;
  createdAt: string;
  attempts: number;
  status: SyncOutboxStatus;
  payload: T;
  lastError?: string;
}

const KEY = "voidmix.desktop.sync-outbox.v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function read<T>(storage: StorageLike): SyncOutboxItem<T>[] {
  try {
    const value = storage.getItem(KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as SyncOutboxItem<T>[]) : [];
  } catch {
    return [];
  }
}

function write<T>(storage: StorageLike, items: SyncOutboxItem<T>[]) {
  storage.setItem(KEY, JSON.stringify(items));
}

export function createSyncOutbox(storage: StorageLike) {
  return {
    list<T = unknown>() {
      return read<T>(storage);
    },
    enqueue<T>(payload: T, id: string = crypto.randomUUID()) {
      const item: SyncOutboxItem<T> = {
        id,
        createdAt: new Date().toISOString(),
        attempts: 0,
        status: "pending",
        payload,
      };
      write(storage, [...read<T>(storage), item]);
      return item;
    },
    clear() {
      write(storage, []);
    },
    async drain<T>(send: (payload: T) => Promise<void>) {
      const items = read<T>(storage);
      let synced = 0;
      for (const item of items) {
        if (item.status === "sending") item.status = "pending";
        item.status = "sending";
        item.attempts += 1;
        write(storage, items);
        try {
          await send(item.payload);
          items.splice(items.indexOf(item), 1);
          synced += 1;
          write(storage, items);
        } catch (error) {
          item.status = "failed";
          item.lastError = error instanceof Error ? error.message : String(error);
          write(storage, items);
        }
      }
      return { synced, pending: items.length };
    },
  };
}

export function browserSyncOutbox() {
  if (typeof window === "undefined") return null;
  return createSyncOutbox(window.localStorage);
}

import { describe, expect, it } from "vite-plus/test";
import { createSyncOutbox } from "./queue";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("desktop sync outbox", () => {
  it("persists local progress while offline and drains after reconnect", async () => {
    const outbox = createSyncOutbox(storage());
    outbox.enqueue({ sessionId: "s1", event: "turn_end" }, "event-1");
    expect(outbox.list()).toHaveLength(1);
    const sent: unknown[] = [];
    const result = await outbox.drain(async (payload) => {
      sent.push(payload);
    });
    expect(result).toEqual({ synced: 1, pending: 0 });
    expect(sent).toEqual([{ sessionId: "s1", event: "turn_end" }]);
  });

  it("retains failed items with retry metadata", async () => {
    const outbox = createSyncOutbox(storage());
    outbox.enqueue({ event: "artifact" }, "event-2");
    await outbox.drain(async () => {
      throw new Error("offline");
    });
    expect(outbox.list()[0]).toMatchObject({
      id: "event-2",
      status: "failed",
      attempts: 1,
      lastError: "offline",
    });
  });
});

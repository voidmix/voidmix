import { describe, expect, it } from "vite-plus/test";
import { runWorker, type OutboxItem, type OutboxRepository } from "./index.js";

describe("V2 outbox worker", () => {
  it("acknowledges successful work and stops on abort", async () => {
    const item: OutboxItem = { id: "event-1", type: "agent.run.created", payload: {} };
    const controller = new AbortController();
    const acknowledged: string[] = [];
    let claimed = false;
    const outbox: OutboxRepository = {
      claim: async () => {
        if (claimed) {
          controller.abort();
          return [];
        }
        claimed = true;
        return [item];
      },
      acknowledge: async ({ id }) => {
        acknowledged.push(id);
      },
      release: async () => undefined,
    };

    await runWorker(
      { outbox, dispatch: async () => undefined, sleep: async () => undefined },
      controller.signal,
    );
    expect(acknowledged).toEqual(["event-1"]);
  });

  it("releases failed work for retry", async () => {
    const released: string[] = [];
    const outbox: OutboxRepository = {
      claim: async () => [{ id: "event-2", type: "agent.run.created", payload: {} }],
      acknowledge: async () => undefined,
      release: async ({ id }) => {
        released.push(id);
      },
    };
    const controller = new AbortController();
    await expect(
      runWorker(
        {
          outbox,
          dispatch: async () => {
            controller.abort();
            throw new Error("failed");
          },
        },
        controller.signal,
      ),
    ).rejects.toThrow("failed");
    expect(released).toEqual(["event-2"]);
  });
});

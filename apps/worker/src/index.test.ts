import { describe, expect, it } from "vite-plus/test";
import {
  createAgentRunDispatcher,
  runWorker,
  type OutboxItem,
  type OutboxRepository,
} from "./index.js";
import type { AgentRunV2, AgentRunV2Repository } from "@voidmix/core";

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

  it("moves a queued V2 run through execution states", async () => {
    let run: AgentRunV2 = {
      id: "run-1",
      projectId: "project-1",
      requestedByUserId: "user-1",
      assetVersionId: null,
      status: "queued",
      attempt: 1,
      input: { goal: "test" },
      output: null,
      error: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
    const repository: AgentRunV2Repository = {
      getById: async () => run,
      create: async () => run,
      updateStatus: async (input) => {
        run = { ...run, ...input, updatedAt: input.now };
        return run;
      },
    };
    const dispatch = createAgentRunDispatcher({
      runs: repository,
      execute: async () => ({ result: "ok" }),
      now: () => new Date(1),
    });
    await dispatch({
      id: "event-1",
      type: "agent.run.queued",
      payload: { runId: "run-1" },
    });
    expect(run.status).toBe("succeeded");
    expect(run.output).toEqual({ result: "ok" });
  });
});

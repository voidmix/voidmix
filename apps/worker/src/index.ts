import type { OutboxEvent, OutboxRepository } from "@voidmix/core";
import type { AgentRunV2, AgentRunV2Repository } from "@voidmix/core";

export type OutboxItem = OutboxEvent;
export type { OutboxRepository } from "@voidmix/core";

export interface WorkerOptions {
  outbox: OutboxRepository;
  dispatch: (item: OutboxItem) => Promise<void>;
  pollMs?: number;
  leaseMs?: number;
  batchSize?: number;
  workerId?: string;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createAgentRunDispatcher(options: {
  runs: AgentRunV2Repository;
  execute: (run: AgentRunV2) => Promise<Record<string, unknown> | null>;
  now?: () => Date;
}): (item: OutboxItem) => Promise<void> {
  const now = options.now ?? (() => new Date());
  return async (item) => {
    if (item.type !== "agent.run.queued") return;
    const runId = typeof item.payload.runId === "string" ? item.payload.runId : null;
    if (!runId) throw new Error("Agent run event is missing runId.");
    const run = await options.runs.getById(runId);
    if (!run || run.status !== "queued") return;
    const running = await options.runs.updateStatus({ id: run.id, status: "running", now: now() });
    if (!running) return;
    try {
      const output = await options.execute(running);
      await options.runs.updateStatus({ id: run.id, status: "succeeded", output, now: now() });
    } catch (error) {
      await options.runs.updateStatus({
        id: run.id,
        status: "failed",
        error: error instanceof Error ? error.message : "Agent execution failed.",
        now: now(),
      });
      throw error;
    }
  };
}

/**
 * Run the Agent outbox loop. The repository owns the atomic lease operation;
 * dispatch failures release the item so another attempt can reclaim it.
 */
export async function runWorker(options: WorkerOptions, signal?: AbortSignal): Promise<void> {
  const pollMs = options.pollMs ?? 1_000;
  const leaseMs = options.leaseMs ?? 60_000;
  const batchSize = options.batchSize ?? 10;
  const workerId = options.workerId ?? "worker-default";
  const sleep = options.sleep ?? defaultSleep;

  while (!signal?.aborted) {
    const items = await options.outbox.claim({ workerId, limit: batchSize, leaseMs });
    if (items.length === 0) {
      await sleep(pollMs);
      continue;
    }

    await Promise.all(
      items.map(async (item) => {
        try {
          await options.dispatch(item);
          await options.outbox.acknowledge({ id: item.id, workerId });
        } catch (error) {
          await options.outbox.release({ id: item.id, workerId });
          throw error;
        }
      }),
    );
  }
}

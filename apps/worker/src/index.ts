import type { OutboxEvent, OutboxRepository } from "@voidmix/core";

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

/**
 * Run the V2 outbox loop. The repository owns the atomic lease operation;
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

import { connectDatabase, PostgresOutboxRepository } from "@voidmix/db";

import { runWorker, type WorkerOptions } from "./index.js";

export interface WorkerRuntime {
  run(signal?: AbortSignal): Promise<void>;
  close(): Promise<void>;
}

/**
 * Compose the long-lived worker from infrastructure at the process boundary.
 * Event handlers stay injected so the worker never owns HTTP sessions or UI
 * state, and can later be wired to the V2 AgentRun application service.
 */
export function createWorkerRuntime(options: {
  databaseUrl: string;
  dispatch: WorkerOptions["dispatch"];
  worker?: Omit<WorkerOptions, "outbox" | "dispatch">;
}): WorkerRuntime {
  const connection = connectDatabase(options.databaseUrl);
  const outbox = new PostgresOutboxRepository(connection.db);
  return {
    run(signal) {
      return runWorker(
        {
          ...options.worker,
          outbox,
          dispatch: options.dispatch,
        },
        signal,
      );
    },
    close: () => connection.close(),
  };
}

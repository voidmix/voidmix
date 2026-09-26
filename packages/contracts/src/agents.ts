import { resourceFields, procedure } from "./common.js";
import { z } from "zod";

export const agentRunStatusV2Schema = z.enum([
  "queued",
  "running",
  "waiting_for_approval",
  "succeeded",
  "failed",
  "cancelled",
]);

export const agentRunV2Schema = z.object({
  ...resourceFields,
  requestedByUserId: z.string().min(1),
  assetVersionId: z.string().min(1).nullable(),
  status: agentRunStatusV2Schema,
  attempt: z.number().int().positive(),
  input: z.record(z.string(), z.unknown()),
  output: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().nullable(),
  updatedAt: z.date(),
});

export const v2CreateAgentRun = procedure(
  {
    projectId: z.string().min(1),
    assetVersionId: z.string().min(1).nullable().optional(),
    idempotencyKey: z.string().trim().min(1).max(200),
    input: z.record(z.string(), z.unknown()).default({}),
  },
  agentRunV2Schema,
);

export const v2GetAgentRun = procedure({ runId: z.string().min(1) }, agentRunV2Schema);

export const v2CancelAgentRun = v2GetAgentRun;

export const v2RetryAgentRun = v2GetAgentRun;

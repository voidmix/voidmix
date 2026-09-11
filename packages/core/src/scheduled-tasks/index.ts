import { DomainError } from "../shared/errors.js";

export const scheduledTaskStatuses = ["active", "paused"] as const;
export type ScheduledTaskStatus = (typeof scheduledTaskStatuses)[number];

export interface ScheduledTask {
  id: string;
  workspaceId: string;
  projectId: string | null;
  createdBy: string;
  name: string;
  instruction: string;
  schedule: string;
  status: ScheduledTaskStatus;
  executionStatus: "configured" | "unavailable";
  nextRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledTaskRepository {
  list(input: {
    workspaceId: string;
    projectId?: string;
    limit: number;
    cursor?: string;
  }): Promise<{ items: ScheduledTask[]; nextCursor: string | null }>;
  getById(id: string): Promise<ScheduledTask | null>;
  create(input: Omit<ScheduledTask, "id" | "createdAt" | "updatedAt">): Promise<ScheduledTask>;
  update(input: {
    id: string;
    name?: string;
    instruction?: string;
    schedule?: string;
    status?: ScheduledTaskStatus;
    nextRunAt?: Date | null;
  }): Promise<ScheduledTask>;
}

export class ScheduledTaskDomainError extends DomainError<
  "SCHEDULE_INVALID" | "SCHEDULE_NOT_FOUND"
> {}

/** Accepts standard 5-field cron and simple @daily/@weekly aliases. */
export function assertValidSchedule(schedule: string): string {
  const value = schedule.trim();
  if (/^@(daily|weekly|monthly|hourly)$/.test(value)) return value;
  const fields = value.split(/\s+/);
  if (fields.length !== 5 || fields.some((field) => !/^[0-9*/?,\-A-Za-z]+$/.test(field))) {
    throw new ScheduledTaskDomainError(
      "SCHEDULE_INVALID",
      "Schedule must be a valid five-field cron expression.",
    );
  }
  return value;
}

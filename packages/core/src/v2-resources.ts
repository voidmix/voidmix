import { DomainError } from "@voidmix/shared";

/** Fields supplied by a caller; persistence supplies timestamps and initial state. */
type NewRecord<T, Defaults extends keyof T = never> = Omit<
  T,
  "createdAt" | "updatedAt" | Defaults
> & { now: Date };
type RecordUpdate<T, Fields extends keyof T> = Pick<T, "id" & keyof T> &
  Partial<Pick<T, Fields>> & { now: Date };

interface ProjectResource {
  id: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}
interface AuthoredResource extends ProjectResource {
  createdByUserId: string;
}

export const taskStatusesV2 = ["todo", "in_progress", "blocked", "done"] as const;
export type TaskStatusV2 = (typeof taskStatusesV2)[number];

export interface TaskV2 extends AuthoredResource {
  title: string;
  status: TaskStatusV2;
}

export interface ProjectTaskV2Repository {
  getById(id: string): Promise<TaskV2 | null>;
  listByProject(projectId: string): Promise<TaskV2[]>;
  create(input: NewRecord<TaskV2, "status">): Promise<TaskV2>;
  update(input: RecordUpdate<TaskV2, "title" | "status">): Promise<TaskV2 | null>;
}

export interface AssetV2 extends AuthoredResource {
  name: string;
  archived: boolean;
}

export interface AssetV2Repository {
  getById(id: string): Promise<AssetV2 | null>;
  listByProject(projectId: string): Promise<AssetV2[]>;
  create(input: NewRecord<AssetV2, "archived">): Promise<AssetV2>;
}

export interface AssetVersionV2 {
  id: string;
  assetId: string;
  projectId: string;
  createdByUserId: string;
  objectKey: string;
  byteSize: number;
  mediaType: string;
  checksum: string;
  createdAt: Date;
}

export interface AssetVersionV2Repository {
  listByAsset(assetId: string): Promise<AssetVersionV2[]>;
  create(input: NewRecord<AssetVersionV2>): Promise<AssetVersionV2>;
}

export const reviewStatusesV2 = ["open", "approved", "rejected"] as const;
export type ReviewStatusV2 = (typeof reviewStatusesV2)[number];

export interface ReviewV2 extends AuthoredResource {
  assetVersionId: string | null;
  status: ReviewStatusV2;
  title: string;
}

export interface ReviewV2Repository {
  getById(id: string): Promise<ReviewV2 | null>;
  listByProject(projectId: string): Promise<ReviewV2[]>;
  create(input: NewRecord<ReviewV2, "status">): Promise<ReviewV2>;
  update(input: { id: string; status: ReviewStatusV2; now: Date }): Promise<ReviewV2 | null>;
}

export interface FeedbackV2 extends ProjectResource {
  reviewId: string;
  authorId: string;
  body: string;
}

export interface FeedbackV2Repository {
  listByReview(reviewId: string): Promise<FeedbackV2[]>;
  create(input: NewRecord<FeedbackV2>): Promise<FeedbackV2>;
}

export interface ActivityV2 {
  id: string;
  projectId: string;
  actorId: string;
  type: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export interface ActivityV2Repository {
  listByProject(projectId: string): Promise<ActivityV2[]>;
}

export const agentRunStatusesV2 = [
  "queued",
  "running",
  "waiting_for_approval",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export type AgentRunStatusV2 = (typeof agentRunStatusesV2)[number];

export interface AgentRunV2 extends ProjectResource {
  requestedByUserId: string;
  assetVersionId: string | null;
  status: AgentRunStatusV2;
  attempt: number;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
}

export interface AgentRunV2Repository {
  getById(id: string): Promise<AgentRunV2 | null>;
  /** Implementations should insert the run and dispatch event atomically. */
  createQueued?(input: NewRecord<AgentRunV2, "status" | "output" | "error">): Promise<AgentRunV2>;
  create(input: NewRecord<AgentRunV2, "status" | "output" | "error">): Promise<AgentRunV2>;
  updateStatus(input: {
    id: string;
    status: AgentRunStatusV2;
    output?: Record<string, unknown> | null;
    error?: string | null;
    now: Date;
  }): Promise<AgentRunV2 | null>;
}

type AgentRunErrorCode = "AGENT_RUN_INVALID_INPUT" | "AGENT_RUN_TERMINAL";
export class AgentRunV2DomainError extends DomainError<AgentRunErrorCode> {
  constructor(code: AgentRunErrorCode, message: string) {
    super(code, message);
    this.name = "AgentRunV2DomainError";
  }
}

export function assertAgentRunCanCancelV2(status: AgentRunStatusV2): void {
  if (status === "succeeded" || status === "failed" || status === "cancelled") {
    throw new AgentRunV2DomainError(
      "AGENT_RUN_TERMINAL",
      "A terminal Agent run cannot be cancelled.",
    );
  }
}

import { DomainError } from "./shared/errors.js";

export const taskStatusesV2 = ["todo", "in_progress", "blocked", "done"] as const;
export type TaskStatusV2 = (typeof taskStatusesV2)[number];

export interface TaskV2 {
  id: string;
  projectId: string;
  createdByUserId: string;
  title: string;
  status: TaskStatusV2;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectTaskV2Repository {
  getById(id: string): Promise<TaskV2 | null>;
  listByProject(projectId: string): Promise<TaskV2[]>;
  create(input: {
    id: string;
    projectId: string;
    createdByUserId: string;
    title: string;
    now: Date;
  }): Promise<TaskV2>;
  update(input: {
    id: string;
    title?: string;
    status?: TaskStatusV2;
    now: Date;
  }): Promise<TaskV2 | null>;
}

export interface AssetV2 {
  id: string;
  projectId: string;
  createdByUserId: string;
  name: string;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetV2Repository {
  getById(id: string): Promise<AssetV2 | null>;
  listByProject(projectId: string): Promise<AssetV2[]>;
  create(input: {
    id: string;
    projectId: string;
    createdByUserId: string;
    name: string;
    now: Date;
  }): Promise<AssetV2>;
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
  create(input: {
    id: string;
    assetId: string;
    projectId: string;
    createdByUserId: string;
    objectKey: string;
    byteSize: number;
    mediaType: string;
    checksum: string;
    now: Date;
  }): Promise<AssetVersionV2>;
}

export const reviewStatusesV2 = ["open", "approved", "rejected"] as const;
export type ReviewStatusV2 = (typeof reviewStatusesV2)[number];

export interface ReviewV2 {
  id: string;
  projectId: string;
  assetVersionId: string | null;
  createdByUserId: string;
  status: ReviewStatusV2;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewV2Repository {
  getById(id: string): Promise<ReviewV2 | null>;
  listByProject(projectId: string): Promise<ReviewV2[]>;
  create(input: {
    id: string;
    projectId: string;
    assetVersionId: string | null;
    createdByUserId: string;
    title: string;
    now: Date;
  }): Promise<ReviewV2>;
  update(input: { id: string; status: ReviewStatusV2; now: Date }): Promise<ReviewV2 | null>;
}

export interface FeedbackV2 {
  id: string;
  reviewId: string;
  projectId: string;
  authorId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackV2Repository {
  listByReview(reviewId: string): Promise<FeedbackV2[]>;
  create(input: {
    id: string;
    reviewId: string;
    projectId: string;
    authorId: string;
    body: string;
    now: Date;
  }): Promise<FeedbackV2>;
}

export interface ActivityV2 {
  id: string;
  projectId: string;
  actorId: string;
  type: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
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

export interface AgentRunV2 {
  id: string;
  projectId: string;
  requestedByUserId: string;
  assetVersionId: string | null;
  status: AgentRunStatusV2;
  attempt: number;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentRunV2Repository {
  getById(id: string): Promise<AgentRunV2 | null>;
  create(input: {
    id: string;
    projectId: string;
    requestedByUserId: string;
    assetVersionId: string | null;
    attempt: number;
    input: Record<string, unknown>;
    now: Date;
  }): Promise<AgentRunV2>;
  updateStatus(input: {
    id: string;
    status: AgentRunStatusV2;
    output?: Record<string, unknown> | null;
    error?: string | null;
    now: Date;
  }): Promise<AgentRunV2 | null>;
}

export class AgentRunV2DomainError extends DomainError<
  "AGENT_RUN_INVALID_INPUT" | "AGENT_RUN_TERMINAL"
> {
  constructor(code: "AGENT_RUN_INVALID_INPUT" | "AGENT_RUN_TERMINAL", message: string) {
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

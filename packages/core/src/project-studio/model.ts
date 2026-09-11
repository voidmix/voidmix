import { DomainError } from "../shared/errors.js";
import type { AgentRunStatus } from "../agents/index.js";
import type { ProjectMemberRepository } from "./members.js";

export const reviewStatuses = ["draft", "open", "changes_requested", "approved", "closed"] as const;
export type ReviewStatus = (typeof reviewStatuses)[number];

export const feedbackStatuses = ["open", "resolved"] as const;
export type FeedbackStatus = (typeof feedbackStatuses)[number];

export const activityTypes = [
  "project.created",
  "project.updated",
  "project.stage.changed",
  "project.archived",
  "project.restored",
  "asset.added",
  "asset.version.committed",
  "review.created",
  "review.status.changed",
  "feedback.created",
  "feedback.resolved",
  "pi.session.started",
  "pi.session.completed",
] as const;
export type ActivityType = (typeof activityTypes)[number];

export type ProjectStudioDomainErrorCode =
  | "REVIEW_NOT_FOUND"
  | "FEEDBACK_NOT_FOUND"
  | "PI_SESSION_NOT_FOUND"
  | "PROJECT_MEMBER_NOT_FOUND"
  | "REVIEW_INVALID_STATUS_TRANSITION"
  | "FEEDBACK_INVALID_STATUS_TRANSITION";

export class ProjectStudioDomainError extends DomainError<ProjectStudioDomainErrorCode> {
  constructor(code: ProjectStudioDomainErrorCode, message: string) {
    super(code, message);
    this.name = "ProjectStudioDomainError";
  }
}

export interface Review {
  id: string;
  projectId: string;
  workspaceId: string;
  targetVersionId: string | null;
  status: ReviewStatus;
  title: string;
  requestedBy: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}

export interface AssetReference {
  id: string;
  projectId: string;
  assetId: string;
  versionId: string | null;
  workspaceId: string;
  label: string | null;
  createdAt: Date;
}

export interface Feedback {
  id: string;
  reviewId: string;
  projectId: string;
  targetVersionId: string;
  authorId: string;
  body: string;
  status: FeedbackStatus;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}

export interface Activity {
  id: string;
  type: ActivityType;
  accountId: string;
  workspaceId: string;
  projectId: string | null;
  actorId: string;
  targetId: string | null;
  summary: string;
  occurredAt: Date;
}

export interface PiSession {
  id: string;
  projectId: string;
  workspaceId: string;
  agentRunId: string;
  requestedBy: string;
  prompt: string;
  context: Record<string, unknown>;
  status: AgentRunStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface PiSessionEvent {
  id: string;
  sessionId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export interface PiSessionEventRepository {
  append(input: Omit<PiSessionEvent, "id" | "createdAt">): Promise<PiSessionEvent>;
  list(sessionId: string, limit?: number): Promise<PiSessionEvent[]>;
}

export interface PiSessionRepository {
  list(query: {
    projectId: string;
    limit: number;
    cursor?: string;
  }): Promise<CursorPage<PiSession>>;
  getById(id: string): Promise<PiSession | null>;
  create(
    input: Omit<PiSession, "id" | "createdAt" | "updatedAt" | "completedAt">,
  ): Promise<PiSession>;
  update(input: {
    id: string;
    agentRunId?: string;
    status?: AgentRunStatus;
    context?: Record<string, unknown>;
    completedAt?: Date | null;
  }): Promise<PiSession>;
}

export interface CursorPage<Item> {
  items: Item[];
  nextCursor: string | null;
}

export interface CursorPageQuery {
  limit: number;
  cursor?: string;
}

export interface ReviewListQuery extends CursorPageQuery {
  projectId: string;
  status?: ReviewStatus;
}

export interface FeedbackListQuery extends CursorPageQuery {
  reviewId: string;
  status?: FeedbackStatus;
}

export interface ActivityListQuery extends CursorPageQuery {
  accountId?: string;
  projectId?: string;
}

export interface CreateReviewInput {
  projectId: string;
  workspaceId: string;
  targetVersionId: string | null;
  title: string;
  requestedBy: string;
}

export interface UpdateReviewInput {
  id: string;
  status?: ReviewStatus;
  title?: string;
  targetVersionId?: string | null;
  actorId?: string;
}

export interface ResolveReviewInput {
  id: string;
  actorId: string;
}

export interface CreateFeedbackInput {
  reviewId: string;
  projectId: string;
  targetVersionId: string;
  authorId: string;
  body: string;
}

export interface UpdateFeedbackInput {
  id: string;
  status?: FeedbackStatus;
  body?: string;
  actorId?: string;
}

export type CreateActivityInput = Omit<Activity, "id" | "occurredAt"> & {
  occurredAt?: Date;
};

export interface ReviewRepository {
  list(query: ReviewListQuery): Promise<CursorPage<Review>>;
  getById(id: string): Promise<Review | null>;
  create(input: CreateReviewInput): Promise<Review>;
  update(input: UpdateReviewInput): Promise<Review>;
  resolve(input: ResolveReviewInput): Promise<Review>;
}

export interface AssetReferenceRepository {
  listByProject(input: {
    projectId: string;
    limit: number;
    cursor?: string;
  }): Promise<CursorPage<AssetReference>>;
  create(
    input: Omit<AssetReference, "id" | "createdAt"> & { id?: string; createdAt?: Date },
  ): Promise<AssetReference>;
}

export interface FeedbackRepository {
  list(query: FeedbackListQuery): Promise<CursorPage<Feedback>>;
  getById(id: string): Promise<Feedback | null>;
  create(input: CreateFeedbackInput): Promise<Feedback>;
  update(input: UpdateFeedbackInput): Promise<Feedback>;
}

export interface ActivityRepository {
  create(input: CreateActivityInput): Promise<Activity>;
  list(query: ActivityListQuery): Promise<CursorPage<Activity>>;
  listByProject(projectId: string, query: CursorPageQuery): Promise<CursorPage<Activity>>;
  listByAccount(accountId: string, query: CursorPageQuery): Promise<CursorPage<Activity>>;
}

export interface ProjectStudioRepositories {
  members?: ProjectMemberRepository;
  assetReferences?: AssetReferenceRepository;
  reviews: ReviewRepository;
  feedback: FeedbackRepository;
  activity: ActivityRepository;
  piSessions?: PiSessionRepository;
  piSessionEvents?: PiSessionEventRepository;
}

const reviewTransitions: Record<ReviewStatus, readonly ReviewStatus[]> = {
  draft: ["draft", "open", "closed"],
  open: ["open", "changes_requested", "approved", "closed"],
  changes_requested: ["changes_requested", "open", "closed"],
  approved: ["approved", "closed"],
  closed: ["closed"],
};

export function canTransitionReviewStatus(from: ReviewStatus, to: ReviewStatus): boolean {
  return reviewTransitions[from].includes(to);
}

export function assertReviewStatusTransition(from: ReviewStatus, to: ReviewStatus): void {
  if (!canTransitionReviewStatus(from, to)) {
    throw new ProjectStudioDomainError(
      "REVIEW_INVALID_STATUS_TRANSITION",
      `Review status cannot change from ${from} to ${to}.`,
    );
  }
}

export function canTransitionFeedbackStatus(from: FeedbackStatus, to: FeedbackStatus): boolean {
  return from === to || (from === "open" && to === "resolved");
}

export function assertFeedbackStatusTransition(from: FeedbackStatus, to: FeedbackStatus): void {
  if (!canTransitionFeedbackStatus(from, to)) {
    throw new ProjectStudioDomainError(
      "FEEDBACK_INVALID_STATUS_TRANSITION",
      `Feedback status cannot change from ${from} to ${to}.`,
    );
  }
}

import type {
  Activity,
  AssetReference,
  AssetReferenceRepository,
  ActivityListQuery,
  ActivityRepository,
  CreateActivityInput,
  CreateFeedbackInput,
  CreateReviewInput,
  CursorPage,
  CursorPageQuery,
  Feedback,
  FeedbackListQuery,
  FeedbackRepository,
  Review,
  ReviewListQuery,
  ReviewRepository,
  ResolveReviewInput,
  UpdateFeedbackInput,
  UpdateReviewInput,
  PiSession,
  PiSessionRepository,
  ProjectMember,
  ProjectMemberRepository,
} from "@voidmix/core";
import {
  assertFeedbackStatusTransition,
  assertReviewStatusTransition,
  defaultClock,
  defaultIdGenerator,
  ProjectStudioDomainError,
} from "@voidmix/core";

export interface ProjectStudioMemoryOptions {
  now?: () => Date;
  id?: () => string;
}

const cloneDate = (value: Date): Date => new Date(value);
const cloneReview = (review: Review): Review => ({
  ...review,
  createdAt: cloneDate(review.createdAt),
  updatedAt: cloneDate(review.updatedAt),
  ...(review.resolvedAt ? { resolvedAt: cloneDate(review.resolvedAt) } : { resolvedAt: null }),
});

const cloneFeedback = (feedback: Feedback): Feedback => ({
  ...feedback,
  createdAt: cloneDate(feedback.createdAt),
  updatedAt: cloneDate(feedback.updatedAt),
  ...(feedback.resolvedAt ? { resolvedAt: cloneDate(feedback.resolvedAt) } : { resolvedAt: null }),
});

const cloneActivity = (activity: Activity): Activity => ({
  ...activity,
  occurredAt: cloneDate(activity.occurredAt),
});

const cloneMember = (member: ProjectMember): ProjectMember => ({
  ...member,
  createdAt: cloneDate(member.createdAt),
  updatedAt: cloneDate(member.updatedAt),
});
const cloneReference = (value: AssetReference): AssetReference => ({
  ...value,
  createdAt: cloneDate(value.createdAt),
});

const clonePiSession = (session: PiSession): PiSession => ({
  ...session,
  context: { ...session.context },
  createdAt: cloneDate(session.createdAt),
  updatedAt: cloneDate(session.updatedAt),
  ...(session.completedAt
    ? { completedAt: cloneDate(session.completedAt) }
    : { completedAt: null }),
});

function pageOffset(cursor: string | undefined): number {
  if (!cursor) return 0;
  const offset = Number.parseInt(cursor, 10);
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
}

function pageLimit(limit: number): number {
  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 1;
}

function page<Item>(items: readonly Item[], query: CursorPageQuery): CursorPage<Item> {
  const offset = pageOffset(query.cursor);
  const limit = pageLimit(query.limit);
  const result = items.slice(offset, offset + limit);
  const nextOffset = offset + result.length;
  return {
    items: [...result],
    nextCursor: nextOffset < items.length ? String(nextOffset) : null,
  };
}

function timestamp(now: () => Date): Date {
  return cloneDate(now());
}

function identifier(id: () => string): string {
  return id();
}

export class InMemoryReviewRepository implements ReviewRepository {
  readonly reviews = new Map<string, Review>();

  constructor(
    seed: readonly Review[] = [],
    private readonly options: ProjectStudioMemoryOptions = {},
  ) {
    for (const review of seed) this.reviews.set(review.id, cloneReview(review));
  }

  async list(query: ReviewListQuery): Promise<CursorPage<Review>> {
    const matches = [...this.reviews.values()]
      .filter(
        (review) =>
          review.projectId === query.projectId &&
          (query.status === undefined || review.status === query.status),
      )
      .sort(
        (left, right) =>
          right.updatedAt.getTime() - left.updatedAt.getTime() || right.id.localeCompare(left.id),
      );
    return page(matches.map(cloneReview), query);
  }

  async getById(id: string): Promise<Review | null> {
    const review = this.reviews.get(id);
    return review ? cloneReview(review) : null;
  }

  async create(input: CreateReviewInput): Promise<Review> {
    const now = timestamp(this.now);
    const review: Review = {
      id: identifier(this.id),
      projectId: input.projectId,
      workspaceId: input.workspaceId,
      targetVersionId: input.targetVersionId,
      status: "draft",
      title: input.title,
      requestedBy: input.requestedBy,
      createdAt: now,
      updatedAt: cloneDate(now),
      resolvedAt: null,
      resolvedBy: null,
    };
    this.reviews.set(review.id, cloneReview(review));
    return cloneReview(review);
  }

  async update(input: UpdateReviewInput): Promise<Review> {
    const current = this.reviews.get(input.id);
    if (!current) {
      throw new ProjectStudioDomainError("REVIEW_NOT_FOUND", `Review ${input.id} was not found.`);
    }
    if (input.status !== undefined) assertReviewStatusTransition(current.status, input.status);

    const updatedAt = timestamp(this.now);
    const updated: Review = {
      ...current,
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.targetVersionId !== undefined ? { targetVersionId: input.targetVersionId } : {}),
      updatedAt,
    };
    if (updated.status === "closed" && current.status !== "closed") {
      updated.resolvedAt = cloneDate(updatedAt);
      updated.resolvedBy = input.actorId ?? null;
    }
    this.reviews.set(updated.id, cloneReview(updated));
    return cloneReview(updated);
  }

  async resolve(input: ResolveReviewInput): Promise<Review> {
    const current = this.reviews.get(input.id);
    if (!current) {
      throw new ProjectStudioDomainError("REVIEW_NOT_FOUND", `Review ${input.id} was not found.`);
    }
    if (current.status === "closed") return cloneReview(current);

    const updatedAt = timestamp(this.now);
    const resolved: Review = {
      ...current,
      status: "closed",
      updatedAt,
      resolvedAt: cloneDate(updatedAt),
      resolvedBy: input.actorId,
    };
    this.reviews.set(resolved.id, cloneReview(resolved));
    return cloneReview(resolved);
  }

  private get now(): () => Date {
    return this.options.now ?? defaultClock.now;
  }

  private get id(): () => string {
    return this.options.id ?? defaultIdGenerator.next;
  }
}

export class InMemoryFeedbackRepository implements FeedbackRepository {
  readonly feedback = new Map<string, Feedback>();

  constructor(
    seed: readonly Feedback[] = [],
    private readonly options: ProjectStudioMemoryOptions = {},
  ) {
    for (const item of seed) this.feedback.set(item.id, cloneFeedback(item));
  }

  async list(query: FeedbackListQuery): Promise<CursorPage<Feedback>> {
    const matches = [...this.feedback.values()]
      .filter(
        (item) =>
          item.reviewId === query.reviewId &&
          (query.status === undefined || item.status === query.status),
      )
      .sort(
        (left, right) =>
          right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id),
      );
    return page(matches.map(cloneFeedback), query);
  }

  async getById(id: string): Promise<Feedback | null> {
    const item = this.feedback.get(id);
    return item ? cloneFeedback(item) : null;
  }

  async create(input: CreateFeedbackInput): Promise<Feedback> {
    const now = timestamp(this.now);
    const item: Feedback = {
      id: identifier(this.id),
      reviewId: input.reviewId,
      projectId: input.projectId,
      targetVersionId: input.targetVersionId,
      authorId: input.authorId,
      body: input.body,
      status: "open",
      createdAt: now,
      updatedAt: cloneDate(now),
      resolvedAt: null,
      resolvedBy: null,
    };
    this.feedback.set(item.id, cloneFeedback(item));
    return cloneFeedback(item);
  }

  async update(input: UpdateFeedbackInput): Promise<Feedback> {
    const current = this.feedback.get(input.id);
    if (!current) {
      throw new ProjectStudioDomainError(
        "FEEDBACK_NOT_FOUND",
        `Feedback ${input.id} was not found.`,
      );
    }
    if (input.status !== undefined) assertFeedbackStatusTransition(current.status, input.status);

    const updatedAt = timestamp(this.now);
    const updated: Feedback = {
      ...current,
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      updatedAt,
    };
    if (updated.status === "resolved" && current.status !== "resolved") {
      updated.resolvedAt = cloneDate(updatedAt);
      updated.resolvedBy = input.actorId ?? null;
    }
    this.feedback.set(updated.id, cloneFeedback(updated));
    return cloneFeedback(updated);
  }

  private get now(): () => Date {
    return this.options.now ?? defaultClock.now;
  }

  private get id(): () => string {
    return this.options.id ?? defaultIdGenerator.next;
  }
}

export class InMemoryActivityRepository implements ActivityRepository {
  readonly activities = new Map<string, Activity>();

  constructor(
    seed: readonly Activity[] = [],
    private readonly options: ProjectStudioMemoryOptions = {},
  ) {
    for (const activity of seed) this.activities.set(activity.id, cloneActivity(activity));
  }

  async create(input: CreateActivityInput): Promise<Activity> {
    const activity: Activity = {
      ...input,
      id: identifier(this.id),
      occurredAt: input.occurredAt ? cloneDate(input.occurredAt) : timestamp(this.now),
    };
    this.activities.set(activity.id, cloneActivity(activity));
    return cloneActivity(activity);
  }

  async list(query: ActivityListQuery): Promise<CursorPage<Activity>> {
    const matches = [...this.activities.values()]
      .filter(
        (activity) =>
          (query.accountId === undefined || activity.accountId === query.accountId) &&
          (query.projectId === undefined || activity.projectId === query.projectId),
      )
      .sort(
        (left, right) =>
          right.occurredAt.getTime() - left.occurredAt.getTime() || right.id.localeCompare(left.id),
      );
    return page(matches.map(cloneActivity), query);
  }

  async listByProject(projectId: string, query: CursorPageQuery): Promise<CursorPage<Activity>> {
    return this.list({ ...query, projectId });
  }

  async listByAccount(accountId: string, query: CursorPageQuery): Promise<CursorPage<Activity>> {
    return this.list({ ...query, accountId });
  }

  private get now(): () => Date {
    return this.options.now ?? defaultClock.now;
  }

  private get id(): () => string {
    return this.options.id ?? defaultIdGenerator.next;
  }
}

export class InMemoryAssetReferenceRepository implements AssetReferenceRepository {
  readonly references = new Map<string, AssetReference>();
  constructor(
    seed: readonly AssetReference[] = [],
    private readonly options: ProjectStudioMemoryOptions = {},
  ) {
    for (const item of seed) this.references.set(item.id, cloneReference(item));
  }
  async listByProject(input: { projectId: string; limit: number; cursor?: string }) {
    const rows = [...this.references.values()]
      .filter((item) => item.projectId === input.projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id));
    const offset = pageOffset(input.cursor);
    const items = rows.slice(offset, offset + input.limit).map(cloneReference);
    return {
      items,
      nextCursor: offset + items.length < rows.length ? String(offset + items.length) : null,
    };
  }
  async create(
    input: Omit<AssetReference, "id" | "createdAt"> & { id?: string; createdAt?: Date },
  ) {
    const item: AssetReference = {
      ...input,
      id: input.id ?? (this.options.id ?? defaultIdGenerator.next)(),
      createdAt: cloneDate(input.createdAt ?? (this.options.now ?? defaultClock.now)()),
    };
    this.references.set(item.id, cloneReference(item));
    return cloneReference(item);
  }
}

export class InMemoryPiSessionRepository implements PiSessionRepository {
  readonly sessions = new Map<string, PiSession>();

  constructor(
    seed: readonly PiSession[] = [],
    private readonly options: ProjectStudioMemoryOptions = {},
  ) {
    for (const session of seed) this.sessions.set(session.id, clonePiSession(session));
  }

  async getById(id: string): Promise<PiSession | null> {
    const session = this.sessions.get(id);
    return session ? clonePiSession(session) : null;
  }

  async list(query: {
    projectId: string;
    limit: number;
    cursor?: string;
  }): Promise<CursorPage<PiSession>> {
    const matches = [...this.sessions.values()]
      .filter((session) => session.projectId === query.projectId)
      .sort(
        (left, right) =>
          right.updatedAt.getTime() - left.updatedAt.getTime() || right.id.localeCompare(left.id),
      );
    return page(matches.map(clonePiSession), query);
  }

  async create(
    input: Omit<PiSession, "id" | "createdAt" | "updatedAt" | "completedAt">,
  ): Promise<PiSession> {
    const now = timestamp(this.now);
    const session: PiSession = {
      ...input,
      id: identifier(this.id),
      context: { ...input.context },
      createdAt: now,
      updatedAt: cloneDate(now),
      completedAt: null,
    };
    if ([...this.sessions.values()].some((item) => item.agentRunId === session.agentRunId)) {
      throw new Error(`Pi session already exists for agent run ${session.agentRunId}`);
    }
    this.sessions.set(session.id, clonePiSession(session));
    return clonePiSession(session);
  }

  async update(input: Parameters<PiSessionRepository["update"]>[0]): Promise<PiSession> {
    const current = this.sessions.get(input.id);
    if (!current) throw new Error(`Cannot update missing Pi session ${input.id}`);
    if (
      input.agentRunId &&
      [...this.sessions.values()].some(
        (item) => item.id !== input.id && item.agentRunId === input.agentRunId,
      )
    ) {
      throw new Error(`Pi session already exists for agent run ${input.agentRunId}`);
    }
    const updated: PiSession = {
      ...current,
      ...(input.agentRunId !== undefined ? { agentRunId: input.agentRunId } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.completedAt !== undefined
        ? { completedAt: input.completedAt ? cloneDate(input.completedAt) : null }
        : {}),
      updatedAt: timestamp(this.now),
    };
    this.sessions.set(updated.id, clonePiSession(updated));
    return clonePiSession(updated);
  }

  private get now(): () => Date {
    return this.options.now ?? defaultClock.now;
  }
  private get id(): () => string {
    return this.options.id ?? defaultIdGenerator.next;
  }
}

export class InMemoryProjectMemberRepository implements ProjectMemberRepository {
  readonly members = new Map<string, ProjectMember>();
  constructor(
    seed: readonly ProjectMember[] = [],
    private readonly options: ProjectStudioMemoryOptions = {},
  ) {
    for (const member of seed)
      this.members.set(`${member.projectId}:${member.userId}`, cloneMember(member));
  }
  async listByProject(projectId: string): Promise<ProjectMember[]> {
    return [...this.members.values()]
      .filter((member) => member.projectId === projectId)
      .map(cloneMember);
  }
  async getByProjectAndUser(input: {
    projectId: string;
    userId: string;
  }): Promise<ProjectMember | null> {
    const member = this.members.get(`${input.projectId}:${input.userId}`);
    return member ? cloneMember(member) : null;
  }
  async upsert(
    input: Omit<ProjectMember, "id" | "createdAt" | "updatedAt">,
  ): Promise<ProjectMember> {
    const key = `${input.projectId}:${input.userId}`;
    const existing = this.members.get(key);
    const now = timestamp(this.now);
    const member: ProjectMember = {
      ...input,
      id: existing?.id ?? identifier(this.id),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.members.set(key, cloneMember(member));
    return cloneMember(member);
  }
  async remove(input: { projectId: string; userId: string }): Promise<ProjectMember> {
    const current = this.members.get(`${input.projectId}:${input.userId}`);
    if (!current) throw new Error(`Cannot remove missing project member ${input.userId}`);
    const updated = { ...current, status: "removed" as const, updatedAt: timestamp(this.now) };
    this.members.set(`${input.projectId}:${input.userId}`, cloneMember(updated));
    return cloneMember(updated);
  }
  private get now(): () => Date {
    return this.options.now ?? defaultClock.now;
  }
  private get id(): () => string {
    return this.options.id ?? defaultIdGenerator.next;
  }
}

export function createInMemoryProjectStudioRepositories(
  options: {
    reviews?: readonly Review[];
    feedback?: readonly Feedback[];
    activities?: readonly Activity[];
    assetReferences?: readonly AssetReference[];
    piSessions?: readonly PiSession[];
    members?: readonly ProjectMember[];
    now?: () => Date;
    id?: () => string;
  } = {},
): {
  reviews: InMemoryReviewRepository;
  feedback: InMemoryFeedbackRepository;
  activity: InMemoryActivityRepository;
  assetReferences: InMemoryAssetReferenceRepository;
  piSessions: InMemoryPiSessionRepository;
  members: InMemoryProjectMemberRepository;
} {
  const repositoryOptions: ProjectStudioMemoryOptions = {
    ...(options.now ? { now: options.now } : {}),
    ...(options.id ? { id: options.id } : {}),
  };
  return {
    reviews: new InMemoryReviewRepository(options.reviews ?? [], repositoryOptions),
    feedback: new InMemoryFeedbackRepository(options.feedback ?? [], repositoryOptions),
    activity: new InMemoryActivityRepository(options.activities ?? [], repositoryOptions),
    assetReferences: new InMemoryAssetReferenceRepository(
      options.assetReferences ?? [],
      repositoryOptions,
    ),
    piSessions: new InMemoryPiSessionRepository(options.piSessions ?? [], repositoryOptions),
    members: new InMemoryProjectMemberRepository(options.members ?? [], repositoryOptions),
  };
}

import { first, inserted } from "./results.js";
import type {
  ProjectTaskV2Repository,
  TaskV2,
  FeedbackV2,
  FeedbackV2Repository,
  ReviewV2,
  ReviewV2Repository,
  AssetV2,
  AssetV2Repository,
  AssetVersionV2,
  AssetVersionV2Repository,
  ActivityV2,
  ActivityV2Repository,
} from "@voidmix/core";
import { asc, desc, eq } from "drizzle-orm";
import {
  v2Feedback,
  v2Assets,
  v2AssetVersions,
  v2ProjectTasks,
  v2Reviews,
  v2Activities,
} from "../schema.js";
import type { Database } from "./types.js";

export class PostgresActivityV2Repository implements ActivityV2Repository {
  constructor(private readonly db: Database) {}

  async listByProject(projectId: string): Promise<ActivityV2[]> {
    return this.db
      .select()
      .from(v2Activities)
      .where(eq(v2Activities.projectId, projectId))
      .orderBy(desc(v2Activities.occurredAt), desc(v2Activities.id));
  }
}

export class PostgresAssetV2Repository implements AssetV2Repository {
  constructor(private readonly db: Database) {}
  async getById(id: string): Promise<AssetV2 | null> {
    return first(this.db.select().from(v2Assets).where(eq(v2Assets.id, id)).limit(1));
  }
  async listByProject(projectId: string): Promise<AssetV2[]> {
    return this.db
      .select()
      .from(v2Assets)
      .where(eq(v2Assets.projectId, projectId))
      .orderBy(desc(v2Assets.updatedAt), desc(v2Assets.id));
  }
  async create({ now, ...record }: Parameters<AssetV2Repository["create"]>[0]): Promise<AssetV2> {
    return inserted(
      this.db
        .insert(v2Assets)
        .values({
          ...record,
          archived: false,
          createdAt: now,
          updatedAt: now,
        })
        .returning(),
      "Asset insert",
    );
  }
}

export class PostgresAssetVersionV2Repository implements AssetVersionV2Repository {
  constructor(private readonly db: Database) {}
  async listByAsset(assetId: string): Promise<AssetVersionV2[]> {
    return this.db
      .select()
      .from(v2AssetVersions)
      .where(eq(v2AssetVersions.assetId, assetId))
      .orderBy(desc(v2AssetVersions.createdAt), desc(v2AssetVersions.id));
  }
  async create({
    now,
    ...record
  }: Parameters<AssetVersionV2Repository["create"]>[0]): Promise<AssetVersionV2> {
    return inserted(
      this.db
        .insert(v2AssetVersions)
        .values({
          ...record,
          createdAt: now,
        })
        .returning(),
      "Asset version insert",
    );
  }
}

export class PostgresReviewV2Repository implements ReviewV2Repository {
  constructor(private readonly db: Database) {}

  async getById(id: string): Promise<ReviewV2 | null> {
    return first(this.db.select().from(v2Reviews).where(eq(v2Reviews.id, id)).limit(1));
  }

  async listByProject(projectId: string): Promise<ReviewV2[]> {
    return this.db
      .select()
      .from(v2Reviews)
      .where(eq(v2Reviews.projectId, projectId))
      .orderBy(desc(v2Reviews.updatedAt), desc(v2Reviews.id));
  }

  async create({ now, ...record }: Parameters<ReviewV2Repository["create"]>[0]): Promise<ReviewV2> {
    return inserted(
      this.db
        .insert(v2Reviews)
        .values({
          ...record,
          status: "open",
          createdAt: now,
          updatedAt: now,
        })
        .returning(),
      "Review insert",
    );
  }

  async update(input: Parameters<ReviewV2Repository["update"]>[0]): Promise<ReviewV2 | null> {
    return first(
      this.db
        .update(v2Reviews)
        .set({ status: input.status, updatedAt: input.now })
        .where(eq(v2Reviews.id, input.id))
        .returning(),
    );
  }
}

export class PostgresFeedbackV2Repository implements FeedbackV2Repository {
  constructor(private readonly db: Database) {}

  async listByReview(reviewId: string): Promise<FeedbackV2[]> {
    return this.db
      .select()
      .from(v2Feedback)
      .where(eq(v2Feedback.reviewId, reviewId))
      .orderBy(asc(v2Feedback.createdAt), asc(v2Feedback.id));
  }

  async create({
    now,
    ...record
  }: Parameters<FeedbackV2Repository["create"]>[0]): Promise<FeedbackV2> {
    return inserted(
      this.db
        .insert(v2Feedback)
        .values({
          ...record,
          createdAt: now,
          updatedAt: now,
        })
        .returning(),
      "Feedback insert",
    );
  }
}

export class PostgresProjectTaskV2Repository implements ProjectTaskV2Repository {
  constructor(private readonly db: Database) {}

  async getById(id: string): Promise<TaskV2 | null> {
    return first(this.db.select().from(v2ProjectTasks).where(eq(v2ProjectTasks.id, id)).limit(1));
  }

  async listByProject(projectId: string): Promise<TaskV2[]> {
    return this.db
      .select()
      .from(v2ProjectTasks)
      .where(eq(v2ProjectTasks.projectId, projectId))
      .orderBy(desc(v2ProjectTasks.updatedAt), desc(v2ProjectTasks.id));
  }

  async create({
    now,
    ...record
  }: Parameters<ProjectTaskV2Repository["create"]>[0]): Promise<TaskV2> {
    return inserted(
      this.db
        .insert(v2ProjectTasks)
        .values({
          ...record,
          status: "todo",
          createdAt: now,
          updatedAt: now,
        })
        .returning(),
      "Task insert",
    );
  }

  async update(input: Parameters<ProjectTaskV2Repository["update"]>[0]): Promise<TaskV2 | null> {
    return first(
      this.db
        .update(v2ProjectTasks)
        .set({
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          updatedAt: input.now,
        })
        .where(eq(v2ProjectTasks.id, input.id))
        .returning(),
    );
  }
}

import type {
  OrganizationMemberV2,
  OrganizationMemberV2Repository,
  ProjectMemberV2,
  ProjectMemberV2Repository,
  ProjectV2,
  ProjectV2Repository,
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
  AgentRunV2,
  AgentRunV2Repository,
} from "@voidmix/core";
import { and, asc, desc, eq } from "drizzle-orm";

import type { DatabaseConnection } from "./postgres.js";
import {
  organizationMembers,
  v2Feedback,
  v2Assets,
  v2AssetVersions,
  v2AgentRuns,
  v2ProjectMembers,
  v2ProjectTasks,
  v2Projects,
  v2Reviews,
} from "./schema.js";

type Database = DatabaseConnection["db"];

export class PostgresAgentRunV2Repository implements AgentRunV2Repository {
  constructor(private readonly db: Database) {}

  async getById(id: string): Promise<AgentRunV2 | null> {
    const [run] = await this.db.select().from(v2AgentRuns).where(eq(v2AgentRuns.id, id)).limit(1);
    return run ?? null;
  }

  async create(input: Parameters<AgentRunV2Repository["create"]>[0]): Promise<AgentRunV2> {
    const [run] = await this.db
      .insert(v2AgentRuns)
      .values({
        id: input.id,
        projectId: input.projectId,
        requestedByUserId: input.requestedByUserId,
        assetVersionId: input.assetVersionId,
        status: "queued",
        attempt: input.attempt,
        input: input.input,
        output: null,
        error: null,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();
    if (!run) throw new Error("Agent run insert did not return a row.");
    return run;
  }

  async updateStatus(
    input: Parameters<AgentRunV2Repository["updateStatus"]>[0],
  ): Promise<AgentRunV2 | null> {
    const [run] = await this.db
      .update(v2AgentRuns)
      .set({
        status: input.status,
        ...(input.output !== undefined ? { output: input.output } : {}),
        ...(input.error !== undefined ? { error: input.error } : {}),
        updatedAt: input.now,
      })
      .where(eq(v2AgentRuns.id, input.id))
      .returning();
    return run ?? null;
  }
}

export class PostgresAssetV2Repository implements AssetV2Repository {
  constructor(private readonly db: Database) {}
  async getById(id: string): Promise<AssetV2 | null> {
    const [asset] = await this.db.select().from(v2Assets).where(eq(v2Assets.id, id)).limit(1);
    return asset ?? null;
  }
  async listByProject(projectId: string): Promise<AssetV2[]> {
    return this.db
      .select()
      .from(v2Assets)
      .where(eq(v2Assets.projectId, projectId))
      .orderBy(desc(v2Assets.updatedAt), desc(v2Assets.id));
  }
  async create(input: Parameters<AssetV2Repository["create"]>[0]): Promise<AssetV2> {
    const [asset] = await this.db
      .insert(v2Assets)
      .values({
        id: input.id,
        projectId: input.projectId,
        createdByUserId: input.createdByUserId,
        name: input.name,
        archived: false,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();
    if (!asset) throw new Error("Asset insert did not return a row.");
    return asset;
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
  async create(input: Parameters<AssetVersionV2Repository["create"]>[0]): Promise<AssetVersionV2> {
    const [version] = await this.db
      .insert(v2AssetVersions)
      .values({
        id: input.id,
        assetId: input.assetId,
        projectId: input.projectId,
        createdByUserId: input.createdByUserId,
        objectKey: input.objectKey,
        byteSize: input.byteSize,
        mediaType: input.mediaType,
        checksum: input.checksum,
        createdAt: input.now,
      })
      .returning();
    if (!version) throw new Error("Asset version insert did not return a row.");
    return version;
  }
}

export class PostgresProjectV2Repository implements ProjectV2Repository {
  constructor(private readonly db: Database) {}

  async getById(id: string): Promise<ProjectV2 | null> {
    const [project] = await this.db.select().from(v2Projects).where(eq(v2Projects.id, id)).limit(1);
    return project ?? null;
  }

  async listByPersonalOwner(userId: string): Promise<ProjectV2[]> {
    return this.db
      .select()
      .from(v2Projects)
      .where(eq(v2Projects.personalOwnerId, userId))
      .orderBy(desc(v2Projects.updatedAt), desc(v2Projects.id));
  }

  async listByOrganization(organizationId: string): Promise<ProjectV2[]> {
    return this.db
      .select()
      .from(v2Projects)
      .where(eq(v2Projects.organizationId, organizationId))
      .orderBy(desc(v2Projects.updatedAt), desc(v2Projects.id));
  }

  async create(input: Parameters<ProjectV2Repository["create"]>[0]): Promise<ProjectV2> {
    const [project] = await this.db
      .insert(v2Projects)
      .values({
        id: input.id,
        createdByUserId: input.createdByUserId,
        personalOwnerId: input.scope.type === "personal" ? input.scope.userId : null,
        organizationId: input.scope.type === "organization" ? input.scope.organizationId : null,
        title: input.title,
        description: input.description ?? null,
        stage: "draft",
        archived: false,
        deadline: null,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();
    if (!project) throw new Error("Project insert did not return a row.");
    return project;
  }

  async update(input: Parameters<ProjectV2Repository["update"]>[0]): Promise<ProjectV2 | null> {
    const [project] = await this.db
      .update(v2Projects)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.stage !== undefined ? { stage: input.stage } : {}),
        ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
        updatedAt: input.now,
      })
      .where(eq(v2Projects.id, input.id))
      .returning();
    return project ?? null;
  }

  async setArchived(input: {
    id: string;
    archived: boolean;
    now: Date;
  }): Promise<ProjectV2 | null> {
    const [project] = await this.db
      .update(v2Projects)
      .set({ archived: input.archived, updatedAt: input.now })
      .where(eq(v2Projects.id, input.id))
      .returning();
    return project ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(v2Projects)
      .where(eq(v2Projects.id, id))
      .returning({ id: v2Projects.id });
    return deleted.length > 0;
  }
}

export class PostgresProjectMemberV2Repository implements ProjectMemberV2Repository {
  constructor(private readonly db: Database) {}

  async getByProjectAndUser(input: {
    projectId: string;
    userId: string;
  }): Promise<ProjectMemberV2 | null> {
    const [member] = await this.db
      .select({
        projectId: v2ProjectMembers.projectId,
        userId: v2ProjectMembers.userId,
        role: v2ProjectMembers.role,
        status: v2ProjectMembers.status,
      })
      .from(v2ProjectMembers)
      .where(
        and(
          eq(v2ProjectMembers.projectId, input.projectId),
          eq(v2ProjectMembers.userId, input.userId),
        ),
      )
      .limit(1);
    return member ?? null;
  }

  async listByProject(projectId: string): Promise<ProjectMemberV2[]> {
    return this.db
      .select({
        projectId: v2ProjectMembers.projectId,
        userId: v2ProjectMembers.userId,
        role: v2ProjectMembers.role,
        status: v2ProjectMembers.status,
      })
      .from(v2ProjectMembers)
      .where(eq(v2ProjectMembers.projectId, projectId))
      .orderBy(asc(v2ProjectMembers.userId));
  }

  async upsert(input: {
    projectId: string;
    userId: string;
    role: ProjectMemberV2["role"];
    now: Date;
  }): Promise<ProjectMemberV2> {
    const [member] = await this.db
      .insert(v2ProjectMembers)
      .values({
        id: `project-member-${input.projectId}-${input.userId}`,
        projectId: input.projectId,
        userId: input.userId,
        role: input.role,
        status: "active",
        createdAt: input.now,
        updatedAt: input.now,
      })
      .onConflictDoUpdate({
        target: [v2ProjectMembers.projectId, v2ProjectMembers.userId],
        set: { role: input.role, status: "active", updatedAt: input.now },
      })
      .returning({
        projectId: v2ProjectMembers.projectId,
        userId: v2ProjectMembers.userId,
        role: v2ProjectMembers.role,
        status: v2ProjectMembers.status,
      });
    if (!member) throw new Error("Project member upsert did not return a row.");
    return member;
  }

  async remove(input: {
    projectId: string;
    userId: string;
    now: Date;
  }): Promise<ProjectMemberV2 | null> {
    const [member] = await this.db
      .update(v2ProjectMembers)
      .set({ status: "removed", updatedAt: input.now })
      .where(
        and(
          eq(v2ProjectMembers.projectId, input.projectId),
          eq(v2ProjectMembers.userId, input.userId),
        ),
      )
      .returning({
        projectId: v2ProjectMembers.projectId,
        userId: v2ProjectMembers.userId,
        role: v2ProjectMembers.role,
        status: v2ProjectMembers.status,
      });
    return member ?? null;
  }
}

export class PostgresReviewV2Repository implements ReviewV2Repository {
  constructor(private readonly db: Database) {}

  async getById(id: string): Promise<ReviewV2 | null> {
    const [review] = await this.db.select().from(v2Reviews).where(eq(v2Reviews.id, id)).limit(1);
    return review ?? null;
  }

  async listByProject(projectId: string): Promise<ReviewV2[]> {
    return this.db
      .select()
      .from(v2Reviews)
      .where(eq(v2Reviews.projectId, projectId))
      .orderBy(desc(v2Reviews.updatedAt), desc(v2Reviews.id));
  }

  async create(input: Parameters<ReviewV2Repository["create"]>[0]): Promise<ReviewV2> {
    const [review] = await this.db
      .insert(v2Reviews)
      .values({
        id: input.id,
        projectId: input.projectId,
        assetVersionId: input.assetVersionId,
        createdByUserId: input.createdByUserId,
        status: "open",
        title: input.title,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();
    if (!review) throw new Error("Review insert did not return a row.");
    return review;
  }

  async update(input: Parameters<ReviewV2Repository["update"]>[0]): Promise<ReviewV2 | null> {
    const [review] = await this.db
      .update(v2Reviews)
      .set({ status: input.status, updatedAt: input.now })
      .where(eq(v2Reviews.id, input.id))
      .returning();
    return review ?? null;
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

  async create(input: Parameters<FeedbackV2Repository["create"]>[0]): Promise<FeedbackV2> {
    const [feedback] = await this.db
      .insert(v2Feedback)
      .values({
        id: input.id,
        reviewId: input.reviewId,
        projectId: input.projectId,
        authorId: input.authorId,
        body: input.body,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();
    if (!feedback) throw new Error("Feedback insert did not return a row.");
    return feedback;
  }
}

export class PostgresProjectTaskV2Repository implements ProjectTaskV2Repository {
  constructor(private readonly db: Database) {}

  async getById(id: string): Promise<TaskV2 | null> {
    const [task] = await this.db
      .select()
      .from(v2ProjectTasks)
      .where(eq(v2ProjectTasks.id, id))
      .limit(1);
    return task ?? null;
  }

  async listByProject(projectId: string): Promise<TaskV2[]> {
    return this.db
      .select()
      .from(v2ProjectTasks)
      .where(eq(v2ProjectTasks.projectId, projectId))
      .orderBy(desc(v2ProjectTasks.updatedAt), desc(v2ProjectTasks.id));
  }

  async create(input: Parameters<ProjectTaskV2Repository["create"]>[0]): Promise<TaskV2> {
    const [task] = await this.db
      .insert(v2ProjectTasks)
      .values({
        id: input.id,
        projectId: input.projectId,
        title: input.title,
        status: "todo",
        createdByUserId: input.createdByUserId,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();
    if (!task) throw new Error("Task insert did not return a row.");
    return task;
  }

  async update(input: Parameters<ProjectTaskV2Repository["update"]>[0]): Promise<TaskV2 | null> {
    const [task] = await this.db
      .update(v2ProjectTasks)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: input.now,
      })
      .where(eq(v2ProjectTasks.id, input.id))
      .returning();
    return task ?? null;
  }
}

export class PostgresOrganizationMemberV2Repository implements OrganizationMemberV2Repository {
  constructor(private readonly db: Database) {}

  async getByOrganizationAndUser(input: {
    organizationId: string;
    userId: string;
  }): Promise<OrganizationMemberV2 | null> {
    const [member] = await this.db
      .select({
        organizationId: organizationMembers.organizationId,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        status: organizationMembers.status,
      })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, input.organizationId),
          eq(organizationMembers.userId, input.userId),
        ),
      )
      .limit(1);
    return member ?? null;
  }

  async listByUser(userId: string): Promise<OrganizationMemberV2[]> {
    return this.db
      .select({
        organizationId: organizationMembers.organizationId,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        status: organizationMembers.status,
      })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId));
  }
}

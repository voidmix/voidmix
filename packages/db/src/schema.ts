import { defineRelations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin", "owner"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended"]);
export const auditActionEnum = pgEnum("audit_action", [
  "user.status.changed",
  "admin.created",
  "system.settings.updated",
  "system.mail.test.sent",
]);
export const auditTargetTypeEnum = pgEnum("audit_target_type", ["user", "system_setting"]);
export const assetStatusEnum = pgEnum("asset_status", ["active", "deleted"]);
export const syncConflictStatusEnum = pgEnum("sync_conflict_status", ["open", "resolved"]);
export const agentRunStatusEnum = pgEnum("agent_run_status", [
  "queued",
  "running",
  "waiting_for_approval",
  "succeeded",
  "failed",
  "cancelled",
]);
export const agentStepStatusEnum = pgEnum("agent_step_status", [
  "queued",
  "running",
  "waiting_for_approval",
  "succeeded",
  "failed",
  "cancelled",
]);
export const workspaceMembershipRoleEnum = pgEnum("workspace_membership_role", [
  "owner",
  "editor",
  "viewer",
]);
export const workspaceMembershipStatusEnum = pgEnum("workspace_membership_status", [
  "active",
  "suspended",
]);
export const projectStageEnum = pgEnum("project_stage", [
  "draft",
  "in_progress",
  "review",
  "delivered",
]);
export const projectTaskStatusEnum = pgEnum("project_task_status", [
  "todo",
  "in_progress",
  "blocked",
  "done",
]);
export const v2ReviewStatusEnum = pgEnum("review_status_v2", ["open", "approved", "rejected"]);
export const v2AgentRunStatusEnum = pgEnum("agent_run_status_v2", [
  "queued",
  "running",
  "waiting_for_approval",
  "succeeded",
  "failed",
  "cancelled",
]);
export const reviewStatusEnum = pgEnum("review_status", [
  "draft",
  "open",
  "changes_requested",
  "approved",
  "closed",
]);
export const feedbackStatusEnum = pgEnum("feedback_status", ["open", "resolved"]);
export const activityTypeEnum = pgEnum("activity_type", [
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
]);
export const projectMemberRoleEnum = pgEnum("project_member_role", [
  "owner",
  "editor",
  "commenter",
  "viewer",
]);
export const organizationRoleEnum = pgEnum("organization_role", [
  "owner",
  "admin",
  "editor",
  "viewer",
]);
export const organizationMembershipStatusEnum = pgEnum("organization_membership_status", [
  "active",
  "removed",
]);
export const v2ProjectMemberRoleEnum = pgEnum("v2_project_member_role", [
  "editor",
  "commenter",
  "viewer",
]);
export const v2ProjectMemberStatusEnum = pgEnum("v2_project_member_status", ["active", "removed"]);
export const projectMemberStatusEnum = pgEnum("project_member_status", ["active", "removed"]);
export const scheduledTaskStatusEnum = pgEnum("scheduled_task_status", ["active", "paused"]);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    displayName: text("display_name").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: roleEnum("role").notNull().default("user"),
    status: userStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("users_created_at_idx").on(table.createdAt),
    index("users_status_role_idx").on(table.status, table.role),
  ],
);

/** V2 organization ownership is optional; personal projects do not reference it. */
export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("organizations_created_by_user_id_idx").on(table.createdByUserId)],
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: organizationRoleEnum("role").notNull().default("viewer"),
    status: organizationMembershipStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("organization_members_organization_user_idx").on(
      table.organizationId,
      table.userId,
    ),
    index("organization_members_user_status_idx").on(table.userId, table.status),
  ],
);

/** Canonical V2 Project tables. Legacy Workspace tables are not used by V2. */
export const v2Projects = pgTable(
  "projects_v2",
  {
    id: text("id").primaryKey(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    personalOwnerId: text("personal_owner_id").references(() => users.id, { onDelete: "restrict" }),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "restrict",
    }),
    title: text("title").notNull(),
    description: text("description"),
    stage: projectStageEnum("stage").notNull().default("draft"),
    archived: boolean("archived").notNull().default(false),
    deadline: timestamp("deadline", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "projects_v2_single_owner_scope",
      sql.raw(
        '(("personal_owner_id" IS NOT NULL)::int + ("organization_id" IS NOT NULL)::int) = 1',
      ),
    ),
    index("projects_v2_personal_owner_updated_idx").on(table.personalOwnerId, table.updatedAt),
    index("projects_v2_organization_updated_idx").on(table.organizationId, table.updatedAt),
  ],
);

export const v2ProjectMembers = pgTable(
  "project_members_v2",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => v2Projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: v2ProjectMemberRoleEnum("role").notNull(),
    status: v2ProjectMemberStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("project_members_v2_project_user_idx").on(table.projectId, table.userId),
    index("project_members_v2_user_status_idx").on(table.userId, table.status),
  ],
);

export const v2ProjectTasks = pgTable(
  "project_tasks_v2",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => v2Projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: projectTaskStatusEnum("status").notNull().default("todo"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("project_tasks_v2_project_updated_idx").on(table.projectId, table.updatedAt)],
);

export const v2Assets = pgTable(
  "assets_v2",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => v2Projects.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("assets_v2_project_updated_idx").on(table.projectId, table.updatedAt)],
);

export const v2AssetVersions = pgTable(
  "asset_versions_v2",
  {
    id: text("id").primaryKey(),
    assetId: text("asset_id")
      .notNull()
      .references(() => v2Assets.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => v2Projects.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    objectKey: text("object_key").notNull(),
    byteSize: integer("byte_size").notNull(),
    mediaType: text("media_type").notNull(),
    checksum: text("checksum").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("asset_versions_v2_object_key_idx").on(table.objectKey),
    index("asset_versions_v2_project_created_idx").on(table.projectId, table.createdAt),
  ],
);

export const v2Reviews = pgTable(
  "reviews_v2",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => v2Projects.id, { onDelete: "cascade" }),
    assetVersionId: text("asset_version_id").references(() => v2AssetVersions.id, {
      onDelete: "set null",
    }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: v2ReviewStatusEnum("status").notNull().default("open"),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("reviews_v2_project_updated_idx").on(table.projectId, table.updatedAt)],
);

export const v2Feedback = pgTable(
  "feedback_v2",
  {
    id: text("id").primaryKey(),
    reviewId: text("review_id")
      .notNull()
      .references(() => v2Reviews.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => v2Projects.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("feedback_v2_review_created_idx").on(table.reviewId, table.createdAt)],
);

export const v2Activities = pgTable(
  "activities_v2",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => v2Projects.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("activities_v2_project_occurred_idx").on(table.projectId, table.occurredAt)],
);

export const v2AgentRuns = pgTable(
  "agent_runs_v2",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => v2Projects.id, { onDelete: "cascade" }),
    requestedByUserId: text("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assetVersionId: text("asset_version_id").references(() => v2AssetVersions.id, {
      onDelete: "set null",
    }),
    status: v2AgentRunStatusEnum("status").notNull().default("queued"),
    attempt: integer("attempt").notNull().default(1),
    input: jsonb("input").$type<Record<string, unknown>>().notNull(),
    output: jsonb("output").$type<Record<string, unknown> | null>(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("agent_runs_v2_project_status_idx").on(table.projectId, table.status)],
);

export const workspaceMemberships = pgTable(
  "workspace_memberships",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceMembershipRoleEnum("role").notNull().default("viewer"),
    status: workspaceMembershipStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("workspace_memberships_workspace_user_idx").on(table.workspaceId, table.userId),
    index("workspace_memberships_user_id_idx").on(table.userId),
    index("workspace_memberships_workspace_status_idx").on(table.workspaceId, table.status),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    stage: projectStageEnum("stage").notNull().default("draft"),
    archived: boolean("archived").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true, mode: "date" }),
    previousStage: projectStageEnum("previous_stage"),
    deadline: timestamp("deadline", { withTimezone: true, mode: "date" }),
    cover: text("cover"),
    thumbnail: text("thumbnail"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("projects_workspace_id_updated_at_idx").on(table.workspaceId, table.updatedAt),
    index("projects_owner_id_idx").on(table.ownerId),
    index("projects_stage_archived_idx").on(table.stage, table.archived),
  ],
);

export const projectTasks = pgTable(
  "project_tasks",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: projectTaskStatusEnum("status").notNull().default("todo"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("project_tasks_project_id_updated_at_idx").on(table.projectId, table.updatedAt),
    index("project_tasks_project_id_status_idx").on(table.projectId, table.status),
    index("project_tasks_created_by_idx").on(table.createdBy),
  ],
);

export const projectMembers = pgTable(
  "project_members",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: projectMemberRoleEnum("role").notNull(),
    status: projectMemberStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("project_members_project_id_user_id_idx").on(table.projectId, table.userId),
    index("project_members_project_id_status_idx").on(table.projectId, table.status),
    index("project_members_workspace_id_user_id_idx").on(table.workspaceId, table.userId),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id").notNull(),
    targetVersionId: text("target_version_id"),
    status: reviewStatusEnum("status").notNull().default("draft"),
    title: text("title").notNull(),
    requestedBy: text("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
    resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    index("reviews_project_id_updated_at_idx").on(table.projectId, table.updatedAt),
    index("reviews_project_id_status_idx").on(table.projectId, table.status),
  ],
);

export const feedback = pgTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    reviewId: text("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    targetVersionId: text("target_version_id").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    status: feedbackStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
    resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    index("feedback_review_id_created_at_idx").on(table.reviewId, table.createdAt),
    index("feedback_project_id_idx").on(table.projectId),
    index("feedback_author_id_idx").on(table.authorId),
  ],
);

export const activities = pgTable(
  "activities",
  {
    id: text("id").primaryKey(),
    type: activityTypeEnum("type").notNull(),
    accountId: text("account_id").notNull(),
    workspaceId: text("workspace_id").notNull(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    targetId: text("target_id"),
    summary: text("summary").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("activities_account_id_occurred_at_idx").on(table.accountId, table.occurredAt),
    index("activities_project_id_occurred_at_idx").on(table.projectId, table.occurredAt),
    index("activities_workspace_id_occurred_at_idx").on(table.workspaceId, table.occurredAt),
  ],
);

export const piSessions = pgTable(
  "pi_sessions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id").notNull(),
    agentRunId: text("agent_run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "restrict" }),
    requestedBy: text("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    prompt: text("prompt").notNull(),
    context: jsonb("context").$type<Record<string, unknown>>().notNull(),
    status: agentRunStatusEnum("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    uniqueIndex("pi_sessions_agent_run_id_idx").on(table.agentRunId),
    index("pi_sessions_project_id_updated_at_idx").on(table.projectId, table.updatedAt),
  ],
);

export const piSessionEvents = pgTable(
  "pi_session_events",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => piSessions.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("pi_session_events_session_created_idx").on(table.sessionId, table.createdAt)],
);

export const scheduledTasks = pgTable(
  "scheduled_tasks",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    instruction: text("instruction").notNull(),
    schedule: text("schedule").notNull(),
    status: scheduledTaskStatusEnum("status").notNull().default("active"),
    executionStatus: text("execution_status").notNull().default("unavailable"),
    nextRunAt: timestamp("next_run_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("scheduled_tasks_workspace_updated_idx").on(table.workspaceId, table.updatedAt),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("auth_sessions_user_id_idx").on(table.userId)],
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: text("id").primaryKey(),
    issuer: text("issuer").notNull().default("voidmix"),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("auth_accounts_user_id_idx").on(table.userId),
    uniqueIndex("auth_accounts_provider_account_idx").on(table.providerId, table.accountId),
  ],
);

export const authVerifications = pgTable(
  "auth_verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("auth_verifications_identifier_idx").on(table.identifier)],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    action: auditActionEnum("action").notNull(),
    targetType: auditTargetTypeEnum("target_type").notNull().default("user"),
    targetId: text("target_id").notNull(),
    targetUserId: text("target_user_id")
      .generatedAlwaysAs(sql`case when "target_type" = 'user' then "target_id" else null end`)
      // No `onUpdate`: PostgreSQL rejects a referential action that would have
      // to write a generated column ("invalid ON UPDATE action for foreign key
      // constraint containing generated column"). `restrict` never writes.
      .references(() => users.id, { onDelete: "restrict" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, string>>().notNull(),
  },
  (table) => [
    index("audit_events_occurred_at_idx").on(table.occurredAt),
    index("audit_events_actor_id_idx").on(table.actorId),
    index("audit_events_target_id_idx").on(table.targetId),
    index("audit_events_target_user_id_idx").on(table.targetUserId),
  ],
);

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    availableAt: timestamp("available_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    leaseOwner: text("lease_owner"),
    leasedUntil: timestamp("leased_until", { withTimezone: true, mode: "date" }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: "date" }),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("outbox_events_available_idx").on(table.availableAt, table.leasedUntil),
    index("outbox_events_delivered_idx").on(table.deliveredAt),
  ],
);

export const systemSettings = pgTable(
  "system_settings",
  {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
  },
  (table) => [index("system_settings_updated_by_idx").on(table.updatedBy)],
);

export const systemSecrets = pgTable(
  "system_secrets",
  {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
  },
  (table) => [index("system_secrets_updated_by_idx").on(table.updatedBy)],
);

export const assets = pgTable(
  "assets",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    path: text("path").notNull(),
    status: assetStatusEnum("status").notNull().default("active"),
    headVersionId: text("head_version_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("assets_workspace_id_path_idx").on(table.workspaceId, table.path),
    index("assets_workspace_id_status_idx").on(table.workspaceId, table.status),
    index("assets_head_version_id_idx").on(table.headVersionId),
  ],
);

export const assetVersions = pgTable(
  "asset_versions",
  {
    id: text("id").primaryKey(),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id").notNull(),
    blobHash: text("blob_hash").notNull(),
    byteSize: integer("byte_size").notNull(),
    contentType: text("content_type"),
    parentVersionId: text("parent_version_id"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    idempotencyKey: text("idempotency_key").notNull(),
  },
  (table) => [
    uniqueIndex("asset_versions_asset_id_idempotency_key_idx").on(
      table.assetId,
      table.idempotencyKey,
    ),
    index("asset_versions_asset_id_created_at_idx").on(table.assetId, table.createdAt),
    index("asset_versions_workspace_id_idx").on(table.workspaceId),
    index("asset_versions_parent_version_id_idx").on(table.parentVersionId),
  ],
);

export const assetReferences = pgTable(
  "asset_references",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    versionId: text("version_id").references(() => assetVersions.id, { onDelete: "set null" }),
    workspaceId: text("workspace_id").notNull(),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("asset_references_project_id_asset_id_idx").on(table.projectId, table.assetId),
    index("asset_references_project_id_created_at_idx").on(table.projectId, table.createdAt),
    index("asset_references_asset_id_idx").on(table.assetId),
  ],
);

export const syncConflicts = pgTable(
  "sync_conflicts",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    localVersionId: text("local_version_id"),
    remoteVersionId: text("remote_version_id"),
    expectedHeadVersionId: text("expected_head_version_id"),
    actualHeadVersionId: text("actual_head_version_id"),
    status: syncConflictStatusEnum("status").notNull().default("open"),
    detectedAt: timestamp("detected_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
    resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    index("sync_conflicts_workspace_id_status_idx").on(table.workspaceId, table.status),
    index("sync_conflicts_asset_id_idx").on(table.assetId),
    index("sync_conflicts_detected_at_idx").on(table.detectedAt),
  ],
);

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    requestedBy: text("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: agentRunStatusEnum("status").notNull().default("queued"),
    goal: text("goal").notNull(),
    currentStepId: text("current_step_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("agent_runs_workspace_id_status_idx").on(table.workspaceId, table.status),
    index("agent_runs_requested_by_idx").on(table.requestedBy),
    index("agent_runs_updated_at_idx").on(table.updatedAt),
  ],
);

export const agentSteps = pgTable(
  "agent_steps",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    status: agentStepStatusEnum("status").notNull().default("queued"),
    name: text("name").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
    error: text("error"),
  },
  (table) => [
    uniqueIndex("agent_steps_run_id_sequence_idx").on(table.runId, table.sequence),
    index("agent_steps_run_id_status_idx").on(table.runId, table.status),
  ],
);

export const agentLeases = pgTable(
  "agent_leases",
  {
    runId: text("run_id")
      .primaryKey()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    holderId: text("holder_id").notNull(),
    acquiredAt: timestamp("acquired_at", { withTimezone: true, mode: "date" }).notNull(),
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true, mode: "date" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [index("agent_leases_expires_at_idx").on(table.expiresAt)],
);

export const schema = {
  users,
  organizations,
  organizationMembers,
  v2Projects,
  v2ProjectMembers,
  v2ProjectTasks,
  v2Assets,
  v2AssetVersions,
  v2Reviews,
  v2Feedback,
  v2Activities,
  v2AgentRuns,
  workspaceMemberships,
  projects,
  projectTasks,
  projectMembers,
  reviews,
  feedback,
  activities,
  piSessions,
  piSessionEvents,
  auditEvents,
  outboxEvents,
  authSessions,
  authAccounts,
  authVerifications,
  systemSettings,
  systemSecrets,
  assets,
  assetVersions,
  assetReferences,
  syncConflicts,
  agentRuns,
  agentSteps,
  agentLeases,
};

export const relations = defineRelations(schema, (r) => ({
  users: {
    organizationMemberships: r.many.organizationMembers({
      from: r.users.id,
      to: r.organizationMembers.userId,
    }),
    workspaceMemberships: r.many.workspaceMemberships({
      from: r.users.id,
      to: r.workspaceMemberships.userId,
    }),
    actedAuditEvents: r.many.auditEvents({
      from: r.users.id,
      to: r.auditEvents.actorId,
      alias: "actor",
    }),
    targetedAuditEvents: r.many.auditEvents({
      from: r.users.id,
      to: r.auditEvents.targetUserId,
      alias: "targetUser",
    }),
    updatedSystemSettings: r.many.systemSettings({
      from: r.users.id,
      to: r.systemSettings.updatedBy,
    }),
    updatedSystemSecrets: r.many.systemSecrets({
      from: r.users.id,
      to: r.systemSecrets.updatedBy,
    }),
    authSessions: r.many.authSessions({
      from: r.users.id,
      to: r.authSessions.userId,
    }),
    authAccounts: r.many.authAccounts({
      from: r.users.id,
      to: r.authAccounts.userId,
    }),
    ownedProjects: r.many.projects({
      from: r.users.id,
      to: r.projects.ownerId,
    }),
    createdProjectTasks: r.many.projectTasks({
      from: r.users.id,
      to: r.projectTasks.createdBy,
    }),
  },
  organizations: {
    creator: r.one.users({
      from: r.organizations.createdByUserId,
      to: r.users.id,
      optional: false,
    }),
    members: r.many.organizationMembers({
      from: r.organizations.id,
      to: r.organizationMembers.organizationId,
    }),
  },
  organizationMembers: {
    organization: r.one.organizations({
      from: r.organizationMembers.organizationId,
      to: r.organizations.id,
      optional: false,
    }),
    user: r.one.users({
      from: r.organizationMembers.userId,
      to: r.users.id,
      optional: false,
    }),
  },
  workspaceMemberships: {
    user: r.one.users({
      from: r.workspaceMemberships.userId,
      to: r.users.id,
      optional: false,
    }),
  },
  projects: {
    owner: r.one.users({ from: r.projects.ownerId, to: r.users.id, optional: false }),
    tasks: r.many.projectTasks({ from: r.projects.id, to: r.projectTasks.projectId }),
    piSessions: r.many.piSessions({ from: r.projects.id, to: r.piSessions.projectId }),
    assetReferences: r.many.assetReferences({
      from: r.projects.id,
      to: r.assetReferences.projectId,
    }),
  },
  v2Projects: {
    creator: r.one.users({
      from: r.v2Projects.createdByUserId,
      to: r.users.id,
      optional: false,
      alias: "v2ProjectCreator",
    }),
    personalOwner: r.one.users({
      from: r.v2Projects.personalOwnerId,
      to: r.users.id,
      alias: "v2ProjectPersonalOwner",
    }),
    organization: r.one.organizations({
      from: r.v2Projects.organizationId,
      to: r.organizations.id,
    }),
    members: r.many.v2ProjectMembers({
      from: r.v2Projects.id,
      to: r.v2ProjectMembers.projectId,
    }),
    tasks: r.many.v2ProjectTasks({
      from: r.v2Projects.id,
      to: r.v2ProjectTasks.projectId,
    }),
  },
  v2ProjectMembers: {
    project: r.one.v2Projects({
      from: r.v2ProjectMembers.projectId,
      to: r.v2Projects.id,
      optional: false,
    }),
    user: r.one.users({
      from: r.v2ProjectMembers.userId,
      to: r.users.id,
      optional: false,
    }),
  },
  v2ProjectTasks: {
    project: r.one.v2Projects({
      from: r.v2ProjectTasks.projectId,
      to: r.v2Projects.id,
      optional: false,
    }),
    creator: r.one.users({
      from: r.v2ProjectTasks.createdByUserId,
      to: r.users.id,
      optional: false,
    }),
  },
  v2Assets: {
    project: r.one.v2Projects({ from: r.v2Assets.projectId, to: r.v2Projects.id, optional: false }),
    versions: r.many.v2AssetVersions({ from: r.v2Assets.id, to: r.v2AssetVersions.assetId }),
  },
  v2AssetVersions: {
    asset: r.one.v2Assets({ from: r.v2AssetVersions.assetId, to: r.v2Assets.id, optional: false }),
    project: r.one.v2Projects({
      from: r.v2AssetVersions.projectId,
      to: r.v2Projects.id,
      optional: false,
    }),
    reviews: r.many.v2Reviews({ from: r.v2AssetVersions.id, to: r.v2Reviews.assetVersionId }),
  },
  v2Reviews: {
    project: r.one.v2Projects({
      from: r.v2Reviews.projectId,
      to: r.v2Projects.id,
      optional: false,
    }),
    assetVersion: r.one.v2AssetVersions({
      from: r.v2Reviews.assetVersionId,
      to: r.v2AssetVersions.id,
    }),
    feedback: r.many.v2Feedback({ from: r.v2Reviews.id, to: r.v2Feedback.reviewId }),
  },
  v2Feedback: {
    review: r.one.v2Reviews({ from: r.v2Feedback.reviewId, to: r.v2Reviews.id, optional: false }),
    project: r.one.v2Projects({
      from: r.v2Feedback.projectId,
      to: r.v2Projects.id,
      optional: false,
    }),
  },
  v2Activities: {
    project: r.one.v2Projects({
      from: r.v2Activities.projectId,
      to: r.v2Projects.id,
      optional: false,
    }),
  },
  v2AgentRuns: {
    project: r.one.v2Projects({
      from: r.v2AgentRuns.projectId,
      to: r.v2Projects.id,
      optional: false,
    }),
    assetVersion: r.one.v2AssetVersions({
      from: r.v2AgentRuns.assetVersionId,
      to: r.v2AssetVersions.id,
    }),
  },
  projectTasks: {
    project: r.one.projects({ from: r.projectTasks.projectId, to: r.projects.id, optional: false }),
    creator: r.one.users({ from: r.projectTasks.createdBy, to: r.users.id, optional: false }),
  },
  projectMembers: {
    project: r.one.projects({
      from: r.projectMembers.projectId,
      to: r.projects.id,
      optional: false,
    }),
    user: r.one.users({ from: r.projectMembers.userId, to: r.users.id, optional: false }),
  },
  reviews: {
    project: r.one.projects({ from: r.reviews.projectId, to: r.projects.id, optional: false }),
    requestedByUser: r.one.users({ from: r.reviews.requestedBy, to: r.users.id, optional: false }),
    resolvedByUser: r.one.users({ from: r.reviews.resolvedBy, to: r.users.id }),
    feedback: r.many.feedback({ from: r.reviews.id, to: r.feedback.reviewId }),
  },
  feedback: {
    review: r.one.reviews({ from: r.feedback.reviewId, to: r.reviews.id, optional: false }),
    project: r.one.projects({ from: r.feedback.projectId, to: r.projects.id, optional: false }),
    author: r.one.users({ from: r.feedback.authorId, to: r.users.id, optional: false }),
    resolvedByUser: r.one.users({ from: r.feedback.resolvedBy, to: r.users.id }),
  },
  activities: {
    project: r.one.projects({ from: r.activities.projectId, to: r.projects.id }),
    actor: r.one.users({ from: r.activities.actorId, to: r.users.id, optional: false }),
  },
  piSessions: {
    project: r.one.projects({ from: r.piSessions.projectId, to: r.projects.id, optional: false }),
    agentRun: r.one.agentRuns({
      from: r.piSessions.agentRunId,
      to: r.agentRuns.id,
      optional: false,
    }),
    requester: r.one.users({ from: r.piSessions.requestedBy, to: r.users.id, optional: false }),
  },
  auditEvents: {
    actor: r.one.users({
      from: r.auditEvents.actorId,
      to: r.users.id,
      alias: "actor",
      optional: false,
    }),
    targetUser: r.one.users({
      from: r.auditEvents.targetUserId,
      to: r.users.id,
      alias: "targetUser",
    }),
  },
  authSessions: {
    user: r.one.users({ from: r.authSessions.userId, to: r.users.id, optional: false }),
  },
  authAccounts: {
    user: r.one.users({ from: r.authAccounts.userId, to: r.users.id, optional: false }),
  },
  authVerifications: {},
  systemSettings: {
    updatedByUser: r.one.users({
      from: r.systemSettings.updatedBy,
      to: r.users.id,
    }),
  },
  systemSecrets: {
    updatedByUser: r.one.users({
      from: r.systemSecrets.updatedBy,
      to: r.users.id,
    }),
  },
  assets: {
    versions: r.many.assetVersions({ from: r.assets.id, to: r.assetVersions.assetId }),
    references: r.many.assetReferences({ from: r.assets.id, to: r.assetReferences.assetId }),
    conflicts: r.many.syncConflicts({ from: r.assets.id, to: r.syncConflicts.assetId }),
  },
  assetVersions: {
    asset: r.one.assets({ from: r.assetVersions.assetId, to: r.assets.id, optional: false }),
    createdByUser: r.one.users({
      from: r.assetVersions.createdBy,
      to: r.users.id,
      optional: false,
    }),
  },
  assetReferences: {
    project: r.one.projects({
      from: r.assetReferences.projectId,
      to: r.projects.id,
      optional: false,
    }),
    asset: r.one.assets({ from: r.assetReferences.assetId, to: r.assets.id, optional: false }),
    version: r.one.assetVersions({ from: r.assetReferences.versionId, to: r.assetVersions.id }),
  },
  syncConflicts: {
    asset: r.one.assets({ from: r.syncConflicts.assetId, to: r.assets.id, optional: false }),
    resolvedByUser: r.one.users({ from: r.syncConflicts.resolvedBy, to: r.users.id }),
  },
  agentRuns: {
    requester: r.one.users({ from: r.agentRuns.requestedBy, to: r.users.id, optional: false }),
    steps: r.many.agentSteps({ from: r.agentRuns.id, to: r.agentSteps.runId }),
    lease: r.one.agentLeases({ from: r.agentRuns.id, to: r.agentLeases.runId }),
    piSession: r.one.piSessions({ from: r.agentRuns.id, to: r.piSessions.agentRunId }),
  },
  agentSteps: {
    run: r.one.agentRuns({ from: r.agentSteps.runId, to: r.agentRuns.id, optional: false }),
  },
  agentLeases: {
    run: r.one.agentRuns({ from: r.agentLeases.runId, to: r.agentRuns.id, optional: false }),
  },
}));

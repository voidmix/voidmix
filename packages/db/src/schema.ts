import { defineRelations, sql } from "drizzle-orm";
import {
  boolean,
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
  workspaceMemberships,
  auditEvents,
  authSessions,
  authAccounts,
  authVerifications,
  systemSettings,
  systemSecrets,
  assets,
  assetVersions,
  syncConflicts,
  agentRuns,
  agentSteps,
  agentLeases,
};

export const relations = defineRelations(schema, (r) => ({
  users: {
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
  },
  workspaceMemberships: {
    user: r.one.users({
      from: r.workspaceMemberships.userId,
      to: r.users.id,
      optional: false,
    }),
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
  syncConflicts: {
    asset: r.one.assets({ from: r.syncConflicts.assetId, to: r.assets.id, optional: false }),
    resolvedByUser: r.one.users({ from: r.syncConflicts.resolvedBy, to: r.users.id }),
  },
  agentRuns: {
    requester: r.one.users({ from: r.agentRuns.requestedBy, to: r.users.id, optional: false }),
    steps: r.many.agentSteps({ from: r.agentRuns.id, to: r.agentSteps.runId }),
    lease: r.one.agentLeases({ from: r.agentRuns.id, to: r.agentLeases.runId }),
  },
  agentSteps: {
    run: r.one.agentRuns({ from: r.agentSteps.runId, to: r.agentRuns.id, optional: false }),
  },
  agentLeases: {
    run: r.one.agentRuns({ from: r.agentLeases.runId, to: r.agentRuns.id, optional: false }),
  },
}));

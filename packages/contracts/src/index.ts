import { error, oc } from "@orpc/contract";
import { z } from "zod";

export const apiErrorCodeSchema = z.string().trim().min(1).max(120);
export const apiErrorValuesSchema = z.record(
  z.string().min(1).max(80),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);
export const apiErrorEnvelopeSchema = z.object({
  code: apiErrorCodeSchema,
  values: apiErrorValuesSchema.optional(),
});
export const apiErrorDataSchema = z.object({ error: apiErrorEnvelopeSchema });
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiErrorData = z.infer<typeof apiErrorDataSchema>;

/** RFC 9457-compatible details carried by API and oRPC error responses. */
export const apiProblemDetailsSchema = z.object({
  type: z.url(),
  title: z.string().min(1),
  status: z.number().int().min(400).max(599),
  code: apiErrorCodeSchema,
  values: apiErrorValuesSchema.default({}),
  fieldErrors: z
    .array(z.object({ field: z.string().min(1), message: z.string().min(1) }))
    .default([]),
  requestId: z.string().min(1),
});
export type ApiProblemDetails = z.infer<typeof apiProblemDetailsSchema>;

export const roleSchema = z.enum(["user", "admin", "owner"]);
export const userStatusSchema = z.enum(["active", "suspended"]);

export const accountProfileSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  displayName: z.string().min(1),
});

export const userSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  displayName: z.string().min(1),
  role: roleSchema,
  status: userStatusSchema,
  createdAt: z.date(),
});

export const userPageSchema = z.object({
  items: z.array(userSchema),
  total: z.number().int().nonnegative(),
  nextCursor: z.string().nullable(),
});

export const auditEventSchema = z.object({
  id: z.string().min(1),
  actorId: z.string().min(1),
  action: z.enum([
    "user.status.changed",
    "admin.created",
    "system.settings.updated",
    "system.mail.test.sent",
  ]),
  targetType: z.enum(["user", "system_setting"]),
  targetId: z.string().min(1),
  targetUserId: z.string().min(1).nullable(),
  occurredAt: z.date(),
  metadata: z.record(z.string(), z.string()),
});

export const settingSourceSchema = z.enum(["database", "environment", "default", "missing"]);
const inheritedSettingSourceSchema = z.enum(["environment", "default", "missing"]);

const inheritedSettingSchema = <Value extends z.ZodType>(value: Value) =>
  z.object({ value, source: inheritedSettingSourceSchema });

const settingMutationSchema = <Value extends z.ZodType>(value: Value) =>
  z.discriminatedUnion("action", [
    z.object({ action: z.literal("set"), value }),
    z.object({ action: z.literal("reset") }),
  ]);

export const mailSettingsSchema = z.object({
  enabled: z.boolean(),
  from: z.email().nullable(),
  fromName: z.string(),
  templatesBaseUrl: z.url().nullable(),
  sources: z.object({
    enabled: settingSourceSchema,
    from: settingSourceSchema,
    fromName: settingSourceSchema,
    templatesBaseUrl: settingSourceSchema,
  }),
  inherited: z.object({
    enabled: inheritedSettingSchema(z.boolean()),
    from: inheritedSettingSchema(z.email().nullable()),
    fromName: inheritedSettingSchema(z.string().min(1)),
    templatesBaseUrl: inheritedSettingSchema(z.url().nullable()),
  }),
  resendApiKey: z.object({
    configured: z.boolean(),
    source: z.enum(["database", "environment", "missing"]),
    inheritedConfigured: z.boolean(),
  }),
  configurationState: z.enum(["ready", "disabled", "incomplete"]),
  missing: z.array(z.enum(["RESEND_API_KEY", "MAIL_FROM"])),
  updatedAt: z.date().nullable(),
});

export const updateMailSettingsSchema = z.object({
  enabled: settingMutationSchema(z.boolean()).optional(),
  from: settingMutationSchema(z.email()).optional(),
  fromName: settingMutationSchema(z.string().trim().min(1).max(200)).optional(),
  templatesBaseUrl: settingMutationSchema(z.url()).optional(),
  resendApiKey: z
    .discriminatedUnion("action", [
      z.object({ action: z.literal("replace"), value: z.string().trim().min(1).max(500) }),
      z.object({ action: z.literal("reset") }),
    ])
    .optional(),
});

export const mailTestResultSchema = z.object({
  sent: z.literal(true),
  recipient: z.email(),
  occurredAt: z.date(),
});

export const registrationModeSchema = z.enum(["open", "closed"]);

export const authSettingsSchema = z.object({
  registrationMode: registrationModeSchema,
  allowedEmailDomains: z.array(z.string().min(1).max(253)).max(100),
  welcomeEmailEnabled: z.boolean(),
  verificationEmailEnabled: z.boolean(),
  passwordResetEmailEnabled: z.boolean(),
  sources: z.object({
    registrationMode: settingSourceSchema,
    allowedEmailDomains: settingSourceSchema,
    welcomeEmailEnabled: settingSourceSchema,
    verificationEmailEnabled: settingSourceSchema,
    passwordResetEmailEnabled: settingSourceSchema,
  }),
  inherited: z.object({
    registrationMode: inheritedSettingSchema(registrationModeSchema),
    allowedEmailDomains: inheritedSettingSchema(z.array(z.string().min(1).max(253)).max(100)),
    welcomeEmailEnabled: inheritedSettingSchema(z.boolean()),
    verificationEmailEnabled: inheritedSettingSchema(z.boolean()),
    passwordResetEmailEnabled: inheritedSettingSchema(z.boolean()),
  }),
  updatedAt: z.date().nullable(),
});

export const updateAuthSettingsSchema = z.object({
  registrationMode: settingMutationSchema(registrationModeSchema).optional(),
  allowedEmailDomains: settingMutationSchema(
    z.array(z.string().trim().min(1).max(253)).max(100),
  ).optional(),
  welcomeEmailEnabled: settingMutationSchema(z.boolean()).optional(),
  verificationEmailEnabled: settingMutationSchema(z.boolean()).optional(),
  passwordResetEmailEnabled: settingMutationSchema(z.boolean()).optional(),
});

export const publicAuthCapabilitiesSchema = z.object({
  registrationAvailable: z.boolean(),
  verificationEmailRequestAvailable: z.boolean(),
  passwordResetRequestAvailable: z.boolean(),
});

export const workspaceMembershipRoleSchema = z.enum(["owner", "editor", "viewer"]);
export const workspaceMembershipStatusSchema = z.enum(["active", "suspended"]);
export const workspaceMembershipSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().trim().min(1),
  userId: z.string().min(1),
  role: workspaceMembershipRoleSchema,
  status: workspaceMembershipStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const assetStatusSchema = z.enum(["active", "deleted"]);
export const syncConflictStatusSchema = z.enum(["open", "resolved"]);
export const assetSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().trim().min(1),
  path: z.string().min(1),
  status: assetStatusSchema,
  headVersionId: z.string().min(1).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export const assetVersionSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  workspaceId: z.string().min(1),
  blobHash: z.string().regex(/^[a-f0-9]{16,}$/),
  byteSize: z.number().int().nonnegative(),
  contentType: z.string().min(1).nullable(),
  parentVersionId: z.string().min(1).nullable(),
  createdBy: z.string().min(1),
  createdAt: z.date(),
  idempotencyKey: z.string().min(1),
});
export const syncConflictSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  assetId: z.string().min(1),
  localVersionId: z.string().min(1).nullable(),
  remoteVersionId: z.string().min(1).nullable(),
  expectedHeadVersionId: z.string().min(1).nullable(),
  actualHeadVersionId: z.string().min(1).nullable(),
  status: syncConflictStatusSchema,
  detectedAt: z.date(),
  resolvedAt: z.date().nullable(),
  resolvedBy: z.string().min(1).nullable(),
});

export const agentRunStatusSchema = z.enum([
  "queued",
  "running",
  "waiting_for_approval",
  "succeeded",
  "failed",
  "cancelled",
]);
export const agentStepStatusSchema = agentRunStatusSchema;
export const agentRunSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  requestedBy: z.string().min(1),
  status: agentRunStatusSchema,
  goal: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
  currentStepId: z.string().min(1).nullable(),
});
export const agentStepSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  status: agentStepStatusSchema,
  name: z.string().min(1),
  startedAt: z.date().nullable(),
  finishedAt: z.date().nullable(),
  error: z.string().nullable(),
});
export const scheduledTaskSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  projectId: z.string().min(1).nullable(),
  createdBy: z.string().min(1),
  name: z.string().min(1),
  instruction: z.string().min(1),
  schedule: z.string().min(1),
  status: z.enum(["active", "paused"]),
  executionStatus: z.enum(["configured", "unavailable"]),
  nextRunAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export const agentLeaseSchema = z.object({
  runId: z.string().min(1),
  holderId: z.string().min(1),
  acquiredAt: z.date(),
  heartbeatAt: z.date(),
  expiresAt: z.date(),
});

export const projectStageSchema = z.enum(["draft", "in_progress", "review", "delivered"]);
export const projectMemberRoleSchema = z.enum(["owner", "editor", "commenter", "viewer"]);
export const projectMemberStatusSchema = z.enum(["active", "removed"]);

export const projectMemberSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  workspaceId: z.string().min(1),
  userId: z.string().min(1),
  role: projectMemberRoleSchema,
  status: projectMemberStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

const projectProgressSchema = z.number().min(0).max(1).nullable();

export const projectSummarySchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  ownerId: z.string().min(1),
  title: z.string().trim().min(1).max(500),
  description: z.string().nullable(),
  cover: z.string().trim().min(1).nullable(),
  thumbnail: z.string().trim().min(1).nullable(),
  stage: projectStageSchema,
  archived: z.boolean(),
  archivedAt: z.date().nullable(),
  stageWasDefaulted: z.boolean(),
  progress: projectProgressSchema,
  deadline: z.date().nullable(),
  lastActivityAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const projectTaskStatusSchema = z.enum(["todo", "in_progress", "blocked", "done"]);
export const projectTaskSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  title: z.string().trim().min(1).max(500),
  status: projectTaskStatusSchema,
  createdBy: z.string().min(1),
  updatedAt: z.date(),
});

export const assetReferenceSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  assetId: z.string().min(1),
  versionId: z.string().min(1).nullable(),
  workspaceId: z.string().min(1),
  label: z.string().trim().min(1).max(500).nullable(),
  createdAt: z.date(),
});

export const assetVersionReferenceSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  workspaceId: z.string().min(1),
  blobHash: z.string().regex(/^[a-f0-9]{16,}$/),
  byteSize: z.number().int().nonnegative(),
  contentType: z.string().min(1).nullable(),
  createdBy: z.string().min(1),
  createdAt: z.date(),
});

export const reviewStatusSchema = z.enum([
  "draft",
  "open",
  "changes_requested",
  "approved",
  "closed",
]);
export const feedbackStatusSchema = z.enum(["open", "resolved"]);

export const reviewSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  workspaceId: z.string().min(1),
  targetVersionId: z.string().min(1).nullable(),
  status: reviewStatusSchema,
  title: z.string().trim().min(1).max(500),
  requestedBy: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
  resolvedAt: z.date().nullable(),
  resolvedBy: z.string().min(1).nullable(),
});

export const feedbackSchema = z.object({
  id: z.string().min(1),
  reviewId: z.string().min(1),
  projectId: z.string().min(1),
  targetVersionId: z.string().min(1),
  authorId: z.string().min(1),
  body: z.string().trim().min(1).max(10_000),
  status: feedbackStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  resolvedAt: z.date().nullable(),
  resolvedBy: z.string().min(1).nullable(),
});

export const activityTypeSchema = z.enum([
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

export const activitySchema = z.object({
  id: z.string().min(1),
  type: activityTypeSchema,
  accountId: z.string().min(1),
  workspaceId: z.string().min(1),
  projectId: z.string().min(1).nullable(),
  actorId: z.string().min(1),
  targetId: z.string().min(1).nullable(),
  summary: z.string().trim().min(1).max(1_000),
  occurredAt: z.date(),
});

export const piSessionStatusSchema = agentRunStatusSchema;
export const piSessionSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  workspaceId: z.string().min(1),
  agentRunId: z.string().min(1),
  requestedBy: z.string().min(1),
  prompt: z.string().min(1).max(10_000),
  context: z.record(z.string(), z.unknown()),
  status: piSessionStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().nullable(),
});
export const piSessionEventSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  type: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.date(),
});

export const projectDetailSchema = projectSummarySchema.extend({
  brief: z.string().nullable(),
  tasks: z.array(projectTaskSchema),
  members: z.array(projectMemberSchema),
  assetReferences: z.array(assetReferenceSchema),
  reviews: z.array(reviewSchema),
  sessions: z.array(piSessionSchema),
});

export const piRunProjectionSchema = z.object({
  sessionId: z.string().min(1),
  runId: z.string().min(1),
  status: agentRunStatusSchema,
  currentStepId: z.string().min(1).nullable(),
  progress: projectProgressSchema,
  error: z.string().nullable(),
  startedAt: z.date().nullable(),
  finishedAt: z.date().nullable(),
});

export const piSessionDetailSchema = piSessionSchema.extend({
  run: piRunProjectionSchema,
  events: z.array(piSessionEventSchema),
});

export const librarySearchResultSchema = z.object({
  assets: z.array(assetSchema),
  versions: z.array(assetVersionReferenceSchema),
  projects: z.array(projectSummarySchema),
  nextCursor: z.string().nullable(),
});

export const cursorPageInfoSchema = z.object({
  nextCursor: z.string().nullable(),
});

export const createCursorPageSchema = <Item extends z.ZodType>(item: Item) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });

export const projectPageSchema = createCursorPageSchema(projectSummarySchema);
export const projectTaskPageSchema = createCursorPageSchema(projectTaskSchema);
export const reviewPageSchema = createCursorPageSchema(reviewSchema);
export const feedbackPageSchema = createCursorPageSchema(feedbackSchema);
export const activityPageSchema = createCursorPageSchema(activitySchema);
export const assetReferencePageSchema = createCursorPageSchema(assetReferenceSchema);
export const assetVersionReferencePageSchema = createCursorPageSchema(assetVersionReferenceSchema);
export const piSessionPageSchema = createCursorPageSchema(piSessionSchema);

export const studioSnapshotSchema = z.object({
  account: accountProfileSchema.extend({
    /** Active Workspace ids used by the Web adapter for create operations. */
    workspaceIds: z.array(z.string().trim().min(1)),
  }),
  projects: z.array(projectSummarySchema),
  reviewAttention: z.array(reviewSchema),
  recentActivity: z.array(activitySchema),
  activeSessions: z.array(piSessionSchema),
  nextProjectsCursor: z.string().nullable(),
});

const MailNotConfiguredError = error("MAIL_NOT_CONFIGURED", {
  message: "Mail configuration is not ready.",
  data: z.object({
    error: apiErrorEnvelopeSchema,
    missing: z.array(z.enum(["RESEND_API_KEY", "MAIL_FROM"])),
  }),
});

const health = oc.input(z.object({})).output(
  z.object({
    status: z.literal("ok"),
    timestamp: z.date(),
  }),
);

const listUsers = oc
  .input(
    z.object({
      query: z.string().trim().min(1).max(200).optional(),
      limit: z.number().int().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }),
  )
  .output(userPageSchema);

const getUser = oc.input(z.object({ userId: z.string().min(1) })).output(userSchema);

const updateUserStatus = oc
  .input(
    z.object({
      userId: z.string().min(1),
      status: userStatusSchema,
    }),
  )
  .output(userSchema);

const listAudit = oc
  .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }))
  .output(z.array(auditEventSchema));

const getMailSettings = oc.input(z.object({})).output(mailSettingsSchema);

const updateMailSettings = oc.input(updateMailSettingsSchema).output(mailSettingsSchema);

const sendMailTest = oc
  .input(z.object({}))
  .output(mailTestResultSchema)
  .errors({ MAIL_NOT_CONFIGURED: MailNotConfiguredError });

const getAuthSettings = oc.input(z.object({})).output(authSettingsSchema);

const updateAuthSettings = oc.input(updateAuthSettingsSchema).output(authSettingsSchema);

const getPublicAuthCapabilities = oc.input(z.object({})).output(publicAuthCapabilitiesSchema);
const getAccountProfile = oc.input(z.object({})).output(accountProfileSchema);

// V2 contracts are account-first. Project scope is the only ownership input;
// the API never accepts a client-supplied workspace or authorization context.
export const projectScopeV2Schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("personal") }),
  z.object({ type: z.literal("organization"), organizationId: z.string().trim().min(1) }),
]);
export const projectStageV2Schema = z.enum(["draft", "in_progress", "review", "delivered"]);
export const projectMemberRoleV2Schema = z.enum(["editor", "commenter", "viewer"]);
export const organizationRoleV2Schema = z.enum(["owner", "admin", "editor", "viewer"]);
export const projectV2Schema = z
  .object({
    id: z.string().min(1),
    createdByUserId: z.string().min(1),
    personalOwnerId: z.string().min(1).nullable(),
    organizationId: z.string().min(1).nullable(),
    title: z.string().min(1),
    description: z.string().nullable(),
    stage: projectStageV2Schema,
    archived: z.boolean(),
    deadline: z.date().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .superRefine((value, context) => {
    if ((value.personalOwnerId === null) === (value.organizationId === null)) {
      context.addIssue({
        code: "custom",
        path: ["personalOwnerId"],
        message: "Exactly one project ownership scope is required.",
      });
    }
  });
export const projectMemberV2Schema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  role: projectMemberRoleV2Schema,
  status: z.enum(["active", "removed"]),
});
export const organizationMemberV2Schema = z.object({
  organizationId: z.string().min(1),
  userId: z.string().min(1),
  role: organizationRoleV2Schema,
  status: z.enum(["active", "removed"]),
});
export const projectCapabilityV2Schema = z.enum([
  "project.read",
  "project.comment",
  "project.write",
  "project.manage",
]);
export const projectTaskStatusV2Schema = z.enum(["todo", "in_progress", "blocked", "done"]);
export const projectTaskV2Schema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  createdByUserId: z.string().min(1),
  title: z.string().min(1),
  status: projectTaskStatusV2Schema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export const reviewStatusV2Schema = z.enum(["open", "approved", "rejected"]);
export const reviewV2Schema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  assetVersionId: z.string().min(1).nullable(),
  createdByUserId: z.string().min(1),
  status: reviewStatusV2Schema,
  title: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export const feedbackV2Schema = z.object({
  id: z.string().min(1),
  reviewId: z.string().min(1),
  projectId: z.string().min(1),
  authorId: z.string().min(1),
  body: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export const assetV2Schema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  createdByUserId: z.string().min(1),
  name: z.string().min(1),
  archived: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export const assetVersionV2Schema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  projectId: z.string().min(1),
  createdByUserId: z.string().min(1),
  objectKey: z.string().min(1),
  byteSize: z.number().int().nonnegative(),
  mediaType: z.string().min(1),
  checksum: z.string().min(1),
  createdAt: z.date(),
});
export const agentRunStatusV2Schema = z.enum([
  "queued",
  "running",
  "waiting_for_approval",
  "succeeded",
  "failed",
  "cancelled",
]);
export const agentRunV2Schema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  requestedByUserId: z.string().min(1),
  assetVersionId: z.string().min(1).nullable(),
  status: agentRunStatusV2Schema,
  attempt: z.number().int().positive(),
  input: z.record(z.string(), z.unknown()),
  output: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const v2ProjectPage = createCursorPageSchema(projectV2Schema);
const v2ListProjects = oc.input(z.object({})).output(v2ProjectPage);
const v2GetProject = oc
  .input(z.object({ projectId: z.string().min(1) }))
  .output(
    z.object({ project: projectV2Schema, access: z.enum(["read", "comment", "write", "manage"]) }),
  );
const v2CreateProject = oc
  .input(
    z.object({
      scope: projectScopeV2Schema,
      title: z.string().trim().min(1).max(500),
      description: z.string().max(10_000).nullable().optional(),
    }),
  )
  .output(projectV2Schema);
const v2UpdateProject = oc
  .input(
    z.object({
      projectId: z.string().min(1),
      title: z.string().trim().min(1).max(500).optional(),
      description: z.string().max(10_000).nullable().optional(),
      stage: projectStageV2Schema.optional(),
      deadline: z.date().nullable().optional(),
    }),
  )
  .output(projectV2Schema);
const v2ArchiveProject = oc
  .input(z.object({ projectId: z.string().min(1) }))
  .output(projectV2Schema);
const v2RestoreProject = v2ArchiveProject;
const v2DeleteProject = oc
  .input(z.object({ projectId: z.string().min(1) }))
  .output(z.object({ deleted: z.literal(true) }));
const v2ListReviews = oc
  .input(z.object({ projectId: z.string().min(1) }))
  .output(z.object({ items: z.array(reviewV2Schema), nextCursor: z.string().nullable() }));
const v2CreateReview = oc
  .input(
    z.object({
      projectId: z.string().min(1),
      assetVersionId: z.string().min(1).nullable(),
      title: z.string().trim().min(1).max(500),
    }),
  )
  .output(reviewV2Schema);
const v2UpdateReview = oc
  .input(z.object({ reviewId: z.string().min(1), status: reviewStatusV2Schema }))
  .output(reviewV2Schema);
const v2ListFeedback = oc
  .input(z.object({ reviewId: z.string().min(1) }))
  .output(z.object({ items: z.array(feedbackV2Schema), nextCursor: z.string().nullable() }));
const v2CreateFeedback = oc
  .input(z.object({ reviewId: z.string().min(1), body: z.string().trim().min(1).max(10_000) }))
  .output(feedbackV2Schema);
const v2ListAssets = oc
  .input(z.object({ projectId: z.string().min(1) }))
  .output(z.object({ items: z.array(assetV2Schema), nextCursor: z.string().nullable() }));
const v2CreateAsset = oc
  .input(z.object({ projectId: z.string().min(1), name: z.string().trim().min(1).max(500) }))
  .output(assetV2Schema);
const v2ListAssetVersions = oc
  .input(z.object({ assetId: z.string().min(1) }))
  .output(z.object({ items: z.array(assetVersionV2Schema), nextCursor: z.string().nullable() }));
const v2CreateAssetUpload = oc
  .input(
    z.object({
      projectId: z.string().min(1),
      byteSize: z.number().int().nonnegative(),
      contentType: z.string().min(1),
      expectedHash: z.string().regex(/^[a-f0-9]{64}$/),
    }),
  )
  .output(
    z.object({
      id: z.string(),
      workspaceId: z.string(),
      actorId: z.string(),
      byteSize: z.number(),
      contentType: z.string(),
      expectedHash: z.string(),
      expiresAt: z.date(),
    }),
  );
const v2CompleteAssetUpload = oc
  .input(
    z.object({
      assetId: z.string().min(1),
      uploadId: z.string().min(1),
      byteSize: z.number().int().nonnegative(),
      contentType: z.string().min(1),
      checksum: z.string().regex(/^[a-f0-9]{64}$/),
      body: z.string().optional(),
    }),
  )
  .output(assetVersionV2Schema);
const v2CreateAgentRun = oc
  .input(
    z.object({
      projectId: z.string().min(1),
      assetVersionId: z.string().min(1).nullable().optional(),
      input: z.record(z.string(), z.unknown()).default({}),
    }),
  )
  .output(agentRunV2Schema);
const v2GetAgentRun = oc.input(z.object({ runId: z.string().min(1) })).output(agentRunV2Schema);
const v2CancelAgentRun = v2GetAgentRun;
const v2RetryAgentRun = v2GetAgentRun;
const v2ListProjectTasks = oc
  .input(z.object({ projectId: z.string().min(1) }))
  .output(z.object({ items: z.array(projectTaskV2Schema), nextCursor: z.string().nullable() }));
const v2CreateProjectTask = oc
  .input(z.object({ projectId: z.string().min(1), title: z.string().trim().min(1).max(500) }))
  .output(projectTaskV2Schema);
const v2UpdateProjectTask = oc
  .input(
    z.object({
      taskId: z.string().min(1),
      title: z.string().trim().min(1).max(500).optional(),
      status: projectTaskStatusV2Schema.optional(),
    }),
  )
  .output(projectTaskV2Schema);
const v2ListProjectMembers = oc
  .input(z.object({ projectId: z.string().min(1) }))
  .output(z.object({ items: z.array(projectMemberV2Schema), nextCursor: z.string().nullable() }));
const v2AddProjectMember = oc
  .input(
    z.object({
      projectId: z.string().min(1),
      userId: z.string().trim().min(1),
      role: projectMemberRoleV2Schema,
    }),
  )
  .output(projectMemberV2Schema);
const v2UpdateProjectMember = v2AddProjectMember;
const v2RemoveProjectMember = oc
  .input(z.object({ projectId: z.string().min(1), userId: z.string().trim().min(1) }))
  .output(projectMemberV2Schema);

const getStudioSnapshot = oc.input(z.object({})).output(studioSnapshotSchema);

const listProjects = oc
  .input(
    z.object({
      stage: projectStageSchema.optional(),
      archived: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }),
  )
  .output(projectPageSchema);

const getProject = oc.input(z.object({ projectId: z.string().min(1) })).output(projectDetailSchema);

const createProject = oc
  .input(
    z.object({
      workspaceId: z.string().trim().min(1).optional(),
      title: z.string().trim().min(1).max(500),
      description: z.string().max(10_000).nullable().optional(),
      deadline: z.date().nullable().optional(),
      idempotencyKey: z.string().trim().min(1).max(500),
    }),
  )
  .output(projectDetailSchema);

const updateProject = oc
  .input(
    z.object({
      projectId: z.string().min(1),
      title: z.string().trim().min(1).max(500).optional(),
      description: z.string().max(10_000).nullable().optional(),
      cover: z.string().trim().min(1).nullable().optional(),
      thumbnail: z.string().trim().min(1).nullable().optional(),
      deadline: z.date().nullable().optional(),
      stage: projectStageSchema.optional(),
    }),
  )
  .output(projectDetailSchema);

const archiveProject = oc
  .input(z.object({ projectId: z.string().min(1) }))
  .output(projectSummarySchema);
const restoreProject = archiveProject.output(projectSummarySchema);

const addProjectMember = oc
  .input(
    z.object({
      projectId: z.string().min(1),
      userId: z.string().min(1),
      role: projectMemberRoleSchema,
    }),
  )
  .output(projectMemberSchema);
const updateProjectMember = addProjectMember;
const removeProjectMember = oc
  .input(z.object({ projectId: z.string().min(1), userId: z.string().min(1) }))
  .output(projectMemberSchema);

const listProjectTasks = oc
  .input(
    z.object({
      projectId: z.string().min(1),
      status: projectTaskStatusSchema.optional(),
      limit: z.number().int().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }),
  )
  .output(projectTaskPageSchema);

const createProjectTask = oc
  .input(
    z.object({
      projectId: z.string().min(1),
      title: z.string().trim().min(1).max(500),
      idempotencyKey: z.string().trim().min(1).max(500),
    }),
  )
  .output(projectTaskSchema);

const updateProjectTask = oc
  .input(
    z.object({
      taskId: z.string().min(1),
      title: z.string().trim().min(1).max(500).optional(),
      status: projectTaskStatusSchema.optional(),
    }),
  )
  .output(projectTaskSchema);

const listProjectAssets = oc
  .input(
    z.object({
      projectId: z.string().min(1),
      limit: z.number().int().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }),
  )
  .output(assetReferencePageSchema);

const createProjectAsset = oc
  .input(
    z.object({
      projectId: z.string().min(1),
      assetId: z.string().min(1),
      versionId: z.string().min(1).nullable().optional(),
      label: z.string().trim().max(200).nullable().optional(),
    }),
  )
  .output(assetReferenceSchema);

const listAssetVersions = oc
  .input(
    z.object({
      assetId: z.string().min(1),
      limit: z.number().int().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }),
  )
  .output(assetVersionReferencePageSchema);

const searchLibrary = oc
  .input(
    z.object({
      query: z.string().trim().min(1).max(200).optional(),
      projectId: z.string().min(1).optional(),
      limit: z.number().int().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }),
  )
  .output(librarySearchResultSchema);

const listReviews = oc
  .input(
    z.object({
      projectId: z.string().min(1),
      status: reviewStatusSchema.optional(),
      limit: z.number().int().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }),
  )
  .output(reviewPageSchema);

const createReview = oc
  .input(
    z.object({
      projectId: z.string().min(1),
      targetVersionId: z.string().min(1).nullable(),
      title: z.string().trim().min(1).max(500),
      idempotencyKey: z.string().trim().min(1).max(500),
    }),
  )
  .output(reviewSchema);

const updateReview = oc
  .input(
    z.object({
      reviewId: z.string().min(1),
      status: reviewStatusSchema,
    }),
  )
  .output(reviewSchema);

const resolveReview = oc.input(z.object({ reviewId: z.string().min(1) })).output(reviewSchema);

const listFeedback = oc
  .input(
    z.object({
      reviewId: z.string().min(1),
      status: feedbackStatusSchema.optional(),
      limit: z.number().int().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }),
  )
  .output(feedbackPageSchema);

const createFeedback = oc
  .input(
    z.object({
      reviewId: z.string().min(1),
      targetVersionId: z.string().min(1),
      body: z.string().trim().min(1).max(10_000),
      idempotencyKey: z.string().trim().min(1).max(500),
    }),
  )
  .output(feedbackSchema);

const updateFeedback = oc
  .input(
    z.object({
      feedbackId: z.string().min(1),
      status: feedbackStatusSchema,
    }),
  )
  .output(feedbackSchema);

const listActivity = oc
  .input(
    z.object({
      projectId: z.string().min(1).optional(),
      limit: z.number().int().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }),
  )
  .output(activityPageSchema);

const createPiSession = oc
  .input(
    z.object({
      projectId: z.string().min(1),
      prompt: z.string().trim().min(1).max(10_000),
      context: z.record(z.string(), z.unknown()).default({}),
      idempotencyKey: z.string().trim().min(1).max(500),
    }),
  )
  .output(piSessionDetailSchema);

const getPiSession = oc
  .input(z.object({ sessionId: z.string().min(1) }))
  .output(piSessionDetailSchema);

const cancelPiSession = getPiSession;
const updatePiSession = oc
  .input(
    z.object({
      sessionId: z.string().min(1),
      parameters: z
        .record(z.string(), z.unknown())
        .refine((v) => Object.keys(v).length > 0)
        .refine((v) => Object.keys(v).length <= 32),
    }),
  )
  .output(piSessionDetailSchema);

const pausePiSession = getPiSession;
const resumePiSession = getPiSession;

const retryPiSession = oc
  .input(
    z.object({
      sessionId: z.string().min(1),
      idempotencyKey: z.string().trim().min(1).max(500),
    }),
  )
  .output(piSessionDetailSchema);

/** Submit a durable remote instruction for execution by a connected Desktop Agent. */
const createRemoteCommand = oc
  .input(
    z.object({
      workspaceId: z.string().trim().min(1),
      instruction: z.string().trim().min(1).max(10_000),
      targetDeviceId: z.string().trim().min(1).optional(),
      idempotencyKey: z.string().trim().min(1).max(500),
    }),
  )
  .output(agentRunSchema);

const createAsset = oc
  .input(z.object({ workspaceId: z.string().trim().min(1), path: z.string().min(1).max(1024) }))
  .output(assetSchema);
const getAsset = oc.input(z.object({ assetId: z.string().min(1) })).output(assetSchema);
const commitAssetVersion = oc
  .input(
    z.object({
      workspaceId: z.string().trim().min(1),
      assetId: z.string().min(1),
      blobHash: z.string().regex(/^[a-f0-9]{16,}$/),
      byteSize: z.number().int().nonnegative(),
      contentType: z.string().min(1).nullable().optional(),
      expectedHeadVersionId: z.string().min(1).nullable(),
      parentVersionId: z.string().min(1).nullable(),
      idempotencyKey: z.string().trim().min(1).max(500),
      localVersionId: z.string().min(1).nullable().optional(),
    }),
  )
  .output(z.object({ version: assetVersionSchema, asset: assetSchema }));
const resolveAssetConflict = oc
  .input(z.object({ conflictId: z.string().min(1) }))
  .output(syncConflictSchema);
const createBlobUpload = oc
  .input(
    z.object({
      workspaceId: z.string().min(1),
      byteSize: z.number().int().nonnegative(),
      contentType: z.string().min(1),
      expectedHash: z.string().regex(/^[a-f0-9]{64}$/),
    }),
  )
  .output(
    z.object({
      id: z.string(),
      workspaceId: z.string(),
      actorId: z.string(),
      byteSize: z.number(),
      contentType: z.string(),
      expectedHash: z.string(),
      expiresAt: z.date(),
    }),
  );
const completeBlobUpload = oc
  .input(
    z.object({
      uploadId: z.string().min(1),
      byteSize: z.number().int().nonnegative(),
      contentType: z.string().min(1),
      blobHash: z.string().regex(/^[a-f0-9]{64}$/),
      body: z.string().optional(),
    }),
  )
  .output(z.object({ blobHash: z.string(), byteSize: z.number(), contentType: z.string() }));
const getBlobDownload = oc
  .input(z.object({ workspaceId: z.string().min(1), blobHash: z.string().regex(/^[a-f0-9]{64}$/) }))
  .output(
    z.object({
      blobHash: z.string(),
      byteSize: z.number(),
      contentType: z.string().nullable(),
      body: z.string(),
    }),
  );

const createAgentRun = oc
  .input(
    z.object({ workspaceId: z.string().trim().min(1), goal: z.string().trim().min(1).max(10_000) }),
  )
  .output(agentRunSchema);
const getAgentRun = oc.input(z.object({ runId: z.string().min(1) })).output(agentRunSchema);
const transitionAgentRun = oc
  .input(z.object({ runId: z.string().min(1), status: agentRunStatusSchema }))
  .output(agentRunSchema);
const acquireAgentLease = oc
  .input(z.object({ runId: z.string().min(1), holderId: z.string().min(1).max(200) }))
  .output(agentLeaseSchema);
const heartbeatAgentLease = acquireAgentLease.output(agentLeaseSchema);
const createAgentStep = oc
  .input(z.object({ runId: z.string().min(1), name: z.string().trim().min(1).max(500) }))
  .output(agentStepSchema);
const transitionAgentStep = oc
  .input(
    z.object({
      stepId: z.string().min(1),
      status: agentStepStatusSchema,
      error: z.string().max(10_000).nullable().optional(),
    }),
  )
  .output(agentStepSchema);
const listScheduledTasks = oc
  .input(
    z.object({
      workspaceId: z.string().min(1),
      projectId: z.string().min(1).optional(),
      limit: z.number().int().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }),
  )
  .output(z.object({ items: z.array(scheduledTaskSchema), nextCursor: z.string().nullable() }));
const createScheduledTask = oc
  .input(
    z.object({
      workspaceId: z.string().min(1),
      projectId: z.string().min(1).nullable().optional(),
      name: z.string().trim().min(1).max(200),
      instruction: z.string().trim().min(1).max(10000),
      schedule: z.string().trim().min(1).max(200),
    }),
  )
  .output(scheduledTaskSchema);
const updateScheduledTask = oc
  .input(
    z.object({
      taskId: z.string().min(1),
      name: z.string().trim().min(1).max(200).optional(),
      instruction: z.string().trim().min(1).max(10000).optional(),
      schedule: z.string().trim().min(1).max(200).optional(),
      status: z.enum(["active", "paused"]).optional(),
      nextRunAt: z.date().nullable().optional(),
    }),
  )
  .output(scheduledTaskSchema);

export const apiContract = {
  health,
  account: {
    profile: { get: getAccountProfile },
  },
  v2: {
    projects: {
      list: v2ListProjects,
      get: v2GetProject,
      create: v2CreateProject,
      update: v2UpdateProject,
      archive: v2ArchiveProject,
      restore: v2RestoreProject,
      delete: v2DeleteProject,
      tasks: {
        list: v2ListProjectTasks,
        create: v2CreateProjectTask,
        update: v2UpdateProjectTask,
      },
      members: {
        list: v2ListProjectMembers,
        add: v2AddProjectMember,
        update: v2UpdateProjectMember,
        remove: v2RemoveProjectMember,
      },
      reviews: {
        list: v2ListReviews,
        create: v2CreateReview,
        update: v2UpdateReview,
        feedback: {
          list: v2ListFeedback,
          create: v2CreateFeedback,
        },
      },
      assets: {
        list: v2ListAssets,
        create: v2CreateAsset,
        versions: { list: v2ListAssetVersions },
        upload: { create: v2CreateAssetUpload, complete: v2CompleteAssetUpload },
      },
      agentRuns: {
        create: v2CreateAgentRun,
        get: v2GetAgentRun,
        cancel: v2CancelAgentRun,
        retry: v2RetryAgentRun,
      },
    },
  },
  studio: {
    snapshot: { get: getStudioSnapshot },
  },
  projects: {
    list: listProjects,
    get: getProject,
    create: createProject,
    update: updateProject,
    archive: archiveProject,
    restore: restoreProject,
    members: {
      add: addProjectMember,
      update: updateProjectMember,
      remove: removeProjectMember,
    },
    assets: {
      list: listProjectAssets,
      create: createProjectAsset,
    },
    tasks: {
      list: listProjectTasks,
      create: createProjectTask,
      update: updateProjectTask,
    },
  },
  library: {
    search: searchLibrary,
    versions: {
      list: listAssetVersions,
    },
  },
  reviews: {
    list: listReviews,
    create: createReview,
    update: updateReview,
    resolve: resolveReview,
    feedback: {
      list: listFeedback,
      create: createFeedback,
      update: updateFeedback,
    },
  },
  activity: {
    list: listActivity,
  },
  pi: {
    sessions: {
      create: createPiSession,
      get: getPiSession,
      cancel: cancelPiSession,
      retry: retryPiSession,
      update: updatePiSession,
      pause: pausePiSession,
      resume: resumePiSession,
    },
  },
  remote: {
    commands: { create: createRemoteCommand },
  },
  scheduled: {
    tasks: { list: listScheduledTasks, create: createScheduledTask, update: updateScheduledTask },
  },
  public: {
    auth: {
      capabilities: {
        get: getPublicAuthCapabilities,
      },
    },
  },
  workspace: {
    assets: {
      create: createAsset,
      get: getAsset,
      commitVersion: commitAssetVersion,
      resolveConflict: resolveAssetConflict,
      upload: { create: createBlobUpload, complete: completeBlobUpload },
      download: { get: getBlobDownload },
    },
    agents: {
      runs: {
        create: createAgentRun,
        get: getAgentRun,
        transition: transitionAgentRun,
        acquireLease: acquireAgentLease,
        heartbeat: heartbeatAgentLease,
      },
      steps: {
        create: createAgentStep,
        transition: transitionAgentStep,
      },
    },
  },
  admin: {
    users: {
      list: listUsers,
      get: getUser,
      updateStatus: updateUserStatus,
    },
    audit: {
      list: listAudit,
    },
    settings: {
      auth: {
        get: getAuthSettings,
        update: updateAuthSettings,
      },
      mail: {
        get: getMailSettings,
        update: updateMailSettings,
        sendTest: sendMailTest,
      },
    },
  },
};

export type ApiContract = typeof apiContract;
export type AccountProfileDto = z.infer<typeof accountProfileSchema>;
export type UserDto = z.infer<typeof userSchema>;
export type UserPageDto = z.infer<typeof userPageSchema>;
export type AuditEventDto = z.infer<typeof auditEventSchema>;
export type MailSettingsDto = z.infer<typeof mailSettingsSchema>;
export type UpdateMailSettingsDto = z.infer<typeof updateMailSettingsSchema>;
export type MailTestResultDto = z.infer<typeof mailTestResultSchema>;
export type AuthSettingsDto = z.infer<typeof authSettingsSchema>;
export type UpdateAuthSettingsDto = z.infer<typeof updateAuthSettingsSchema>;
export type PublicAuthCapabilitiesDto = z.infer<typeof publicAuthCapabilitiesSchema>;
export type WorkspaceMembershipDto = z.infer<typeof workspaceMembershipSchema>;
export type AssetDto = z.infer<typeof assetSchema>;
export type AssetVersionDto = z.infer<typeof assetVersionSchema>;
export type SyncConflictDto = z.infer<typeof syncConflictSchema>;
export type AgentRunDto = z.infer<typeof agentRunSchema>;
export type AgentStepDto = z.infer<typeof agentStepSchema>;
export type AgentLeaseDto = z.infer<typeof agentLeaseSchema>;
export type ScheduledTaskDto = z.infer<typeof scheduledTaskSchema>;
export type ProjectStage = z.infer<typeof projectStageSchema>;
export type ProjectMemberDto = z.infer<typeof projectMemberSchema>;
export type ProjectSummaryDto = z.infer<typeof projectSummarySchema>;
export type ProjectDetailDto = z.infer<typeof projectDetailSchema>;
export type ProjectTaskDto = z.infer<typeof projectTaskSchema>;
export type AssetReferenceDto = z.infer<typeof assetReferenceSchema>;
export type AssetVersionReferenceDto = z.infer<typeof assetVersionReferenceSchema>;
export type ReviewDto = z.infer<typeof reviewSchema>;
export type FeedbackDto = z.infer<typeof feedbackSchema>;
export type ActivityDto = z.infer<typeof activitySchema>;
export type PiSessionDto = z.infer<typeof piSessionSchema>;
export type PiRunProjectionDto = z.infer<typeof piRunProjectionSchema>;
export type PiSessionDetailDto = z.infer<typeof piSessionDetailSchema>;
export type PiSessionEventDto = z.infer<typeof piSessionEventSchema>;
export type LibrarySearchResultDto = z.infer<typeof librarySearchResultSchema>;
export type StudioSnapshotDto = z.infer<typeof studioSnapshotSchema>;

export type ProjectScopeV2Dto = z.infer<typeof projectScopeV2Schema>;
export type ProjectV2Dto = z.infer<typeof projectV2Schema>;
export type ProjectMemberV2Dto = z.infer<typeof projectMemberV2Schema>;
export type OrganizationMemberV2Dto = z.infer<typeof organizationMemberV2Schema>;
export type ProjectCapabilityV2Dto = z.infer<typeof projectCapabilityV2Schema>;

import { describe, expect, it } from "vite-plus/test";

import {
  agentRunSchema,
  apiContract,
  assetSchema,
  assetVersionSchema,
  authSettingsSchema,
  activityPageSchema,
  feedbackSchema,
  mailSettingsSchema,
  piRunProjectionSchema,
  piSessionSchema,
  projectDetailSchema,
  projectSummarySchema,
  reviewSchema,
  syncConflictSchema,
  userSchema,
} from "./index.js";

describe("userSchema", () => {
  it("preserves native Date values for the RPC protocol", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const user = userSchema.parse({
      id: "user-1",
      email: "person@example.com",
      displayName: "Person",
      role: "user",
      status: "active",
      createdAt,
    });

    expect(user.createdAt).toBe(createdAt);
  });
});

describe("mailSettingsSchema", () => {
  it("preserves the native update date without accepting a secret", () => {
    const updatedAt = new Date("2026-08-24T00:00:00.000Z");
    const settings = mailSettingsSchema.parse({
      enabled: true,
      from: "mail@example.com",
      fromName: "Voidmix",
      templatesBaseUrl: null,
      sources: {
        enabled: "default",
        from: "environment",
        fromName: "default",
        templatesBaseUrl: "missing",
      },
      inherited: {
        enabled: { value: true, source: "default" },
        from: { value: "mail@example.com", source: "environment" },
        fromName: { value: "Voidmix", source: "default" },
        templatesBaseUrl: { value: null, source: "missing" },
      },
      resendApiKey: {
        configured: true,
        source: "environment",
        inheritedConfigured: true,
      },
      configurationState: "ready",
      missing: [],
      updatedAt,
      secretValue: "must-be-stripped",
    });

    expect(settings.updatedAt).toBe(updatedAt);
    expect(settings).not.toHaveProperty("secretValue");
  });

  it("keeps a legacy empty database sender name readable so it can be reset", () => {
    const settings = mailSettingsSchema.parse({
      enabled: false,
      from: null,
      fromName: "",
      templatesBaseUrl: null,
      sources: {
        enabled: "default",
        from: "missing",
        fromName: "database",
        templatesBaseUrl: "missing",
      },
      inherited: {
        enabled: { value: true, source: "default" },
        from: { value: null, source: "missing" },
        fromName: { value: "Voidmix", source: "default" },
        templatesBaseUrl: { value: null, source: "missing" },
      },
      resendApiKey: {
        configured: false,
        source: "missing",
        inheritedConfigured: false,
      },
      configurationState: "disabled",
      missing: [],
      updatedAt: null,
    });

    expect(settings.fromName).toBe("");
    expect(settings.sources.fromName).toBe("database");
  });
});

describe("authSettingsSchema", () => {
  it("preserves the native update date", () => {
    const updatedAt = new Date("2026-08-24T01:00:00.000Z");
    const settings = authSettingsSchema.parse({
      registrationMode: "open",
      allowedEmailDomains: ["example.com"],
      welcomeEmailEnabled: true,
      verificationEmailEnabled: true,
      passwordResetEmailEnabled: true,
      sources: {
        registrationMode: "default",
        allowedEmailDomains: "database",
        welcomeEmailEnabled: "default",
        verificationEmailEnabled: "default",
        passwordResetEmailEnabled: "default",
      },
      inherited: {
        registrationMode: { value: "open", source: "default" },
        allowedEmailDomains: { value: [], source: "default" },
        welcomeEmailEnabled: { value: true, source: "default" },
        verificationEmailEnabled: { value: true, source: "default" },
        passwordResetEmailEnabled: { value: true, source: "default" },
      },
      updatedAt,
    });

    expect(settings.updatedAt).toBe(updatedAt);
  });
});

describe("workspace schemas and contract", () => {
  it("keeps asset and Agent dates native and exposes the typed procedure tree", () => {
    const timestamp = new Date("2026-09-08T00:00:00.000Z");
    const asset = assetSchema.parse({
      id: "asset-1",
      workspaceId: "workspace-1",
      path: "docs/readme.md",
      status: "active",
      headVersionId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const version = assetVersionSchema.parse({
      id: "version-1",
      assetId: asset.id,
      workspaceId: asset.workspaceId,
      blobHash: "0123456789abcdef",
      byteSize: 12,
      contentType: null,
      parentVersionId: null,
      createdBy: "user-1",
      createdAt: timestamp,
      idempotencyKey: "upload-1",
    });
    const run = agentRunSchema.parse({
      id: "run-1",
      workspaceId: asset.workspaceId,
      requestedBy: "user-1",
      status: "queued",
      goal: "Index assets",
      createdAt: timestamp,
      updatedAt: timestamp,
      currentStepId: null,
    });

    expect(asset.createdAt).toBe(timestamp);
    expect(version.createdAt).toBe(timestamp);
    expect(run.updatedAt).toBe(timestamp);
    expect(apiContract.workspace.assets.commitVersion).toBeDefined();
    expect(apiContract.workspace.agents.runs.heartbeat).toBeDefined();
  });

  it("rejects malformed asset versions and conflicts", () => {
    expect(() =>
      assetVersionSchema.parse({
        id: "version-1",
        assetId: "asset-1",
        workspaceId: "workspace-1",
        blobHash: "not-a-hash",
        byteSize: 1,
        contentType: null,
        parentVersionId: null,
        createdBy: "user-1",
        createdAt: new Date(),
        idempotencyKey: "upload-1",
      }),
    ).toThrow();
    expect(() =>
      syncConflictSchema.parse({
        id: "conflict-1",
        workspaceId: "workspace-1",
        assetId: "asset-1",
        localVersionId: null,
        remoteVersionId: null,
        expectedHeadVersionId: null,
        actualHeadVersionId: null,
        status: "open",
        detectedAt: "not-a-date",
        resolvedAt: null,
        resolvedBy: null,
      }),
    ).toThrow();
  });
});

describe("Project Studio schemas and contract", () => {
  it("keeps canonical project, review, feedback, activity, and Pi dates native", () => {
    const timestamp = new Date("2026-09-09T00:00:00.000Z");
    const summary = projectSummarySchema.parse({
      id: "project-1",
      workspaceId: "workspace-1",
      ownerId: "user-1",
      title: "Launch film",
      description: null,
      cover: null,
      thumbnail: null,
      stage: "review",
      archived: false,
      archivedAt: null,
      stageWasDefaulted: false,
      progress: 0.75,
      deadline: null,
      lastActivityAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const review = reviewSchema.parse({
      id: "review-1",
      projectId: summary.id,
      workspaceId: summary.workspaceId,
      targetVersionId: "version-1",
      status: "open",
      title: "Color pass",
      requestedBy: "user-1",
      createdAt: timestamp,
      updatedAt: timestamp,
      resolvedAt: null,
      resolvedBy: null,
    });
    const detail = projectDetailSchema.parse({
      ...summary,
      brief: null,
      tasks: [],
      members: [],
      assetReferences: [],
      reviews: [review],
      sessions: [],
    });
    const feedback = feedbackSchema.parse({
      id: "feedback-1",
      reviewId: review.id,
      projectId: summary.id,
      targetVersionId: "version-1",
      authorId: "user-2",
      body: "Please lift the shadows.",
      status: "open",
      createdAt: timestamp,
      updatedAt: timestamp,
      resolvedAt: null,
      resolvedBy: null,
    });
    const session = piSessionSchema.parse({
      id: "session-1",
      projectId: summary.id,
      workspaceId: summary.workspaceId,
      agentRunId: "run-1",
      requestedBy: "user-1",
      prompt: "Summarize the review.",
      context: { reviewId: review.id },
      status: "running",
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: null,
    });
    const run = piRunProjectionSchema.parse({
      sessionId: session.id,
      runId: session.agentRunId,
      status: session.status,
      currentStepId: null,
      progress: null,
      error: null,
      startedAt: timestamp,
      finishedAt: null,
    });

    expect(summary.updatedAt).toBe(timestamp);
    expect(detail.reviews).toHaveLength(1);
    expect(review.updatedAt).toBe(timestamp);
    expect(feedback.createdAt).toBe(timestamp);
    expect(run.startedAt).toBe(timestamp);
  });

  it("exposes bounded cursor procedures for the Studio surfaces", () => {
    const timestamp = new Date("2026-09-09T00:00:00.000Z");
    const page = activityPageSchema.parse({ items: [], nextCursor: null });

    expect(page.nextCursor).toBeNull();
    expect(apiContract.studio.snapshot.get).toBeDefined();
    expect(apiContract.projects.list).toBeDefined();
    expect(apiContract.library.search).toBeDefined();
    expect(apiContract.reviews.feedback.create).toBeDefined();
    expect(apiContract.activity.list).toBeDefined();
    expect(apiContract.pi.sessions.cancel).toBeDefined();
    expect(timestamp).toBeInstanceOf(Date);
  });

  it("rejects invalid lifecycle and review values", () => {
    expect(() => projectSummarySchema.parse({ stage: "active" })).toThrow();
    expect(() => reviewSchema.parse({ status: "pending" })).toThrow();
  });
});

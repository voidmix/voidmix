import { describe, expect, it } from "vite-plus/test";

import {
  agentRunSchema,
  apiContract,
  assetSchema,
  assetVersionSchema,
  authSettingsSchema,
  mailSettingsSchema,
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

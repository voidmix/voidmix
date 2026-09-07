import {
  createAgentAdministration,
  createAssetAdministration,
  type AuditEvent,
  type User,
} from "@voidmix/core";
import { describe, expect, it } from "vite-plus/test";

import {
  createInMemoryAgentRepositories,
  createInMemoryAssetRepositories,
  InMemorySystemSettingsRepository,
  InMemoryUserRepository,
  InMemoryWorkspaceMembershipRepository,
} from "./memory.js";

const users: User[] = [
  {
    id: "user-1",
    email: "first@example.com",
    displayName: "First",
    role: "user",
    status: "active",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    id: "user-2",
    email: "second@example.com",
    displayName: "Second",
    role: "admin",
    status: "active",
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
  },
];

describe("InMemoryUserRepository", () => {
  it("supports search and cursor pagination", async () => {
    const repository = new InMemoryUserRepository(users);
    const firstPage = await repository.list({ limit: 1 });
    const secondPage = await repository.list({
      limit: 1,
      ...(firstPage.nextCursor ? { cursor: firstPage.nextCursor } : {}),
    });

    expect(firstPage.items[0]?.id).toBe("user-2");
    expect(secondPage.items[0]?.id).toBe("user-1");
    expect((await repository.list({ limit: 10, query: "FIRST" })).total).toBe(1);
  });
});

describe("InMemoryWorkspaceMembershipRepository", () => {
  it("looks up a membership by user and workspace", async () => {
    const repository = new InMemoryWorkspaceMembershipRepository([
      {
        id: "membership-1",
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "editor",
        status: "active",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    await expect(
      repository.getByUserAndWorkspace({ userId: "user-1", workspaceId: "workspace-1" }),
    ).resolves.toMatchObject({ role: "editor" });
    await expect(
      repository.getByUserAndWorkspace({ userId: "user-2", workspaceId: "workspace-1" }),
    ).resolves.toBeNull();
  });
});

describe("InMemorySystemSettingsRepository", () => {
  const fallback = {
    enabled: { value: true, source: "default" },
    from: { value: "environment@example.com", source: "environment" },
    fromName: { value: "Environment", source: "environment" },
    templatesBaseUrl: {
      value: "https://environment.example.com",
      source: "environment",
    },
    resendApiKey: { value: "environment-key", source: "environment" },
  } as const;

  it("resolves typed auth policy values from system settings", async () => {
    const repository = new InMemorySystemSettingsRepository({
      settings: {
        "auth.registration_mode": "closed",
        "auth.allowed_email_domains": '["example.com","studio.example"]',
        "mail.welcome_enabled": "false",
        "mail.verification_enabled": "true",
        "mail.password_reset_enabled": "false",
      },
    });

    await expect(repository.getAuthSettings()).resolves.toMatchObject({
      registrationMode: "closed",
      allowedEmailDomains: ["example.com", "studio.example"],
      welcomeEmailEnabled: false,
      verificationEmailEnabled: true,
      passwordResetEmailEnabled: false,
    });
  });

  it("audits auth policy changes once and records only changed field names", async () => {
    const auditEvents: AuditEvent[] = [];
    const repository = new InMemorySystemSettingsRepository({ auditEvents });
    const input = {
      actorId: "owner-1",
      settings: {
        registrationMode: { action: "set" as const, value: "closed" as const },
        allowedEmailDomains: { action: "set" as const, value: ["example.com"] },
        welcomeEmailEnabled: { action: "set" as const, value: false },
      },
      audit: {
        id: "audit-auth-1",
        actorId: "owner-1",
        action: "system.settings.updated" as const,
        targetType: "system_setting" as const,
        targetId: "auth",
        targetUserId: null,
        occurredAt: new Date("2026-08-24T01:00:00.000Z"),
        metadata: {},
      },
    };

    await repository.updateAuthSettings(input);
    await repository.updateAuthSettings({
      ...input,
      audit: { ...input.audit, id: "audit-auth-2" },
    });

    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0]).toMatchObject({
      targetId: "auth",
      metadata: { result: "updated" },
    });
    expect(auditEvents[0]?.metadata.fields).toContain("auth.registration_mode");
    expect(auditEvents[0]?.metadata.operations).toContain("auth.registration_mode:set");
    expect(JSON.stringify(auditEvents)).not.toContain("example.com");
    expect(JSON.stringify(auditEvents)).not.toContain('"closed"');
  });

  it("resets auth overrides to defaults and ignores an absent repeated reset", async () => {
    const repository = new InMemorySystemSettingsRepository({
      settings: { "auth.registration_mode": "closed" },
    });
    const audit = {
      id: "audit-auth-reset-1",
      actorId: "owner-1",
      action: "system.settings.updated",
      targetType: "system_setting",
      targetId: "auth",
      targetUserId: null,
      occurredAt: new Date("2026-08-24T01:30:00.000Z"),
      metadata: {},
    } as const;

    const updated = await repository.updateAuthSettings({
      actorId: "owner-1",
      settings: { registrationMode: { action: "reset" } },
      audit,
    });
    await repository.updateAuthSettings({
      actorId: "owner-1",
      settings: { registrationMode: { action: "reset" } },
      audit: { ...audit, id: "audit-auth-reset-2" },
    });

    expect(repository.settings.has("auth.registration_mode")).toBe(false);
    expect(updated).toMatchObject({
      registrationMode: "open",
      sources: { registrationMode: "default" },
    });
    expect(repository.auditEvents).toHaveLength(1);
    expect(repository.auditEvents[0]?.metadata.operations).toBe("auth.registration_mode:reset");
  });

  it("prefers database values and never exposes the secret", async () => {
    const repository = new InMemorySystemSettingsRepository({
      settings: { "mail.from": "database@example.com" },
      secrets: { "mail.resend_api_key": "database-key" },
    });

    const settings = await repository.getMailSettings(fallback);
    const runtime = await repository.resolveMailConfiguration(fallback);

    expect(settings).toMatchObject({
      from: "database@example.com",
      fromName: "Environment",
      sources: { from: "database", fromName: "environment" },
      resendApiKey: { configured: true, source: "database", inheritedConfigured: true },
      configurationState: "ready",
    });
    expect(settings.resendApiKey).not.toHaveProperty("value");
    expect(runtime.resendApiKey).toBe("database-key");
  });

  it("keeps an omitted key and deletes its database override only when reset", async () => {
    const auditEvents: AuditEvent[] = [];
    const repository = new InMemorySystemSettingsRepository({
      secrets: { "mail.resend_api_key": "database-key" },
      auditEvents,
    });
    const audit = {
      id: "audit-1",
      actorId: "admin-1",
      action: "system.settings.updated",
      targetType: "system_setting",
      targetId: "mail",
      targetUserId: null,
      occurredAt: new Date("2026-08-24T00:00:00.000Z"),
      metadata: {},
    } as const;
    await repository.updateMailSettings({
      actorId: "admin-1",
      settings: {},
      fallback,
      audit,
    });
    expect(repository.secrets.get("mail.resend_api_key")?.value).toBe("database-key");

    await repository.updateMailSettings({
      actorId: "admin-1",
      settings: { resendApiKey: { action: "reset" } },
      fallback,
      audit: { ...audit, id: "audit-2" },
    });
    expect(repository.secrets.has("mail.resend_api_key")).toBe(false);
    expect((await repository.getMailSettings(fallback)).resendApiKey).toMatchObject({
      configured: true,
      source: "environment",
    });
    expect(auditEvents.at(-1)?.metadata).not.toHaveProperty("resendApiKey");
    expect(auditEvents.at(-1)?.metadata.operations).toContain("mail.resend_api_key:reset");
    expect(JSON.stringify(auditEvents)).not.toContain("database-key");
  });

  it("does not audit a repeated no-op update", async () => {
    const repository = new InMemorySystemSettingsRepository();
    const input = {
      actorId: "admin-1",
      settings: {
        enabled: { action: "set" as const, value: false },
      },
      fallback,
      audit: {
        id: "audit-1",
        actorId: "admin-1",
        action: "system.settings.updated" as const,
        targetType: "system_setting" as const,
        targetId: "mail",
        targetUserId: null,
        occurredAt: new Date("2026-08-24T00:00:00.000Z"),
        metadata: {},
      },
    };

    await repository.updateMailSettings(input);
    await repository.updateMailSettings({ ...input, audit: { ...input.audit, id: "audit-2" } });
    expect(repository.auditEvents).toHaveLength(1);
  });

  it("does not create database overrides for omitted mail fields", async () => {
    const repository = new InMemorySystemSettingsRepository();

    await repository.updateMailSettings({
      actorId: "admin-1",
      settings: { fromName: { action: "set", value: "Database sender" } },
      fallback,
      audit: {
        id: "audit-one-mail-field",
        actorId: "admin-1",
        action: "system.settings.updated",
        targetType: "system_setting",
        targetId: "mail",
        targetUserId: null,
        occurredAt: new Date("2026-08-24T01:45:00.000Z"),
        metadata: {},
      },
    });

    expect([...repository.settings.keys()]).toEqual(["mail.from_name"]);
    expect(repository.secrets.size).toBe(0);
  });

  it("resets ordinary database overrides without persisting inherited values", async () => {
    const repository = new InMemorySystemSettingsRepository({
      settings: { "mail.from": "database@example.com" },
    });

    const updated = await repository.updateMailSettings({
      actorId: "admin-1",
      settings: { from: { action: "reset" } },
      fallback,
      audit: {
        id: "audit-reset",
        actorId: "admin-1",
        action: "system.settings.updated",
        targetType: "system_setting",
        targetId: "mail",
        targetUserId: null,
        occurredAt: new Date("2026-08-24T02:00:00.000Z"),
        metadata: {},
      },
    });

    expect(repository.settings.has("mail.from")).toBe(false);
    expect(updated).toMatchObject({
      from: "environment@example.com",
      sources: { from: "environment" },
    });
  });
});

describe("InMemory asset and Agent repositories", () => {
  it("allows only one concurrent asset at a workspace path", async () => {
    const repositories = createInMemoryAssetRepositories();
    let sequence = 0;
    const administration = createAssetAdministration({
      repositories,
      id: () => `path-${++sequence}`,
    });

    const results = await Promise.allSettled([
      administration.create({ workspaceId: "workspace-1", path: "docs/same.md" }),
      administration.create({ workspaceId: "workspace-1", path: "docs/same.md" }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(repositories.assets.assets.size).toBe(1);
  });

  it("persists immutable asset versions and records sync conflicts", async () => {
    const repositories = createInMemoryAssetRepositories();
    let sequence = 0;
    const administration = createAssetAdministration({
      repositories,
      now: () => new Date("2026-08-24T03:00:00.000Z"),
      id: () => `asset-${++sequence}`,
    });

    const asset = await administration.create({
      workspaceId: "workspace-1",
      path: "docs/readme.md",
    });
    const committed = await administration.commitVersion({
      actorId: "user-1",
      assetId: asset.id,
      workspaceId: asset.workspaceId,
      blobHash: "abcdef0123456789",
      byteSize: 10,
      expectedHeadVersionId: null,
      parentVersionId: null,
      idempotencyKey: "upload-1",
    });
    const replay = await administration.commitVersion({
      actorId: "user-1",
      assetId: asset.id,
      workspaceId: asset.workspaceId,
      blobHash: "abcdef0123456789",
      byteSize: 10,
      expectedHeadVersionId: null,
      parentVersionId: null,
      idempotencyKey: "upload-1",
    });

    expect(replay.version.id).toBe(committed.version.id);
    expect((await repositories.assets.getById(asset.id))?.headVersionId).toBe(committed.version.id);
    const stored = await repositories.versions.getById(committed.version.id);
    expect(stored).not.toBe(committed.version);
    expect(repositories.versions.versions.size).toBe(1);
    await expect(
      administration.commitVersion({
        actorId: "user-1",
        assetId: asset.id,
        workspaceId: asset.workspaceId,
        blobHash: "abcdef0123456789",
        byteSize: 10,
        expectedHeadVersionId: null,
        parentVersionId: null,
        idempotencyKey: "upload-2",
      }),
    ).rejects.toMatchObject({ code: "ASSET_HEAD_CONFLICT" });
    expect(repositories.conflicts.conflicts.size).toBe(1);
  });

  it("allocates Agent step sequences and renews a lease through repository ports", async () => {
    const repositories = createInMemoryAgentRepositories();
    let tick = 0;
    const now = () => new Date(`2026-08-24T03:0${tick++}:00.000Z`);
    const administration = createAgentAdministration({
      repositories,
      now,
      id: () => `agent-${tick}`,
      leaseDurationMs: 120_000,
    });
    const run = await administration.createRun({
      workspaceId: "workspace-1",
      requestedBy: "user-1",
      goal: "index assets",
    });
    const first = await administration.createStep({ runId: run.id, name: "scan" });
    const second = await administration.createStep({ runId: run.id, name: "summarize" });
    const lease = await administration.acquireLease({ runId: run.id, holderId: "worker-1" });
    const renewed = await administration.heartbeat({ runId: run.id, holderId: "worker-1" });

    expect([first.sequence, second.sequence]).toEqual([1, 2]);
    expect(renewed.expiresAt.getTime()).toBeGreaterThan(lease.expiresAt.getTime());
    const storedRun = await repositories.runs.getById(run.id);
    expect(storedRun?.currentStepId).toBe(second.id);
  });

  it("serializes Agent lease acquisition and step sequence allocation", async () => {
    const repositories = createInMemoryAgentRepositories();
    let sequence = 0;
    const administration = createAgentAdministration({
      repositories,
      id: () => `race-${++sequence}`,
      leaseDurationMs: 10_000,
    });
    const run = await administration.createRun({
      workspaceId: "workspace-1",
      requestedBy: "user-1",
      goal: "race",
    });

    const leases = await Promise.allSettled([
      administration.acquireLease({ runId: run.id, holderId: "worker-1" }),
      administration.acquireLease({ runId: run.id, holderId: "worker-2" }),
    ]);
    expect(leases.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(leases.filter((result) => result.status === "rejected")).toHaveLength(1);

    const steps = await Promise.all([
      administration.createStep({ runId: run.id, name: "first" }),
      administration.createStep({ runId: run.id, name: "second" }),
    ]);
    expect(steps.map((step) => step.sequence).sort()).toEqual([1, 2]);
  });

  it("rejects a stale concurrent Agent transition", async () => {
    const repositories = createInMemoryAgentRepositories();
    const administration = createAgentAdministration({
      repositories,
      id: () => "transition-run",
    });
    const run = await administration.createRun({
      workspaceId: "workspace-1",
      requestedBy: "user-1",
      goal: "transition",
    });

    const results = await Promise.allSettled([
      administration.transitionRun({ runId: run.id, status: "running" }),
      administration.transitionRun({ runId: run.id, status: "cancelled" }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((await administration.getRun(run.id))?.status).toBe("running");
  });

  it("preserves a step linked after an Agent transition snapshot was read", async () => {
    const repositories = createInMemoryAgentRepositories();
    let sequence = 0;
    const administration = createAgentAdministration({
      repositories,
      now: () => new Date("2026-08-24T03:30:00.000Z"),
      id: () => `aggregate-${++sequence}`,
    });
    const run = await administration.createRun({
      workspaceId: "workspace-1",
      requestedBy: "user-1",
      goal: "preserve aggregate fields",
    });
    const staleSnapshot = await repositories.runs.getById(run.id);
    expect(staleSnapshot).not.toBeNull();
    const step = await administration.createStep({ runId: run.id, name: "first" });

    const result = await repositories.commands.transitionRun({
      run: {
        ...staleSnapshot!,
        status: "running",
        updatedAt: new Date("2026-08-24T03:31:00.000Z"),
      },
      expectedStatus: "queued",
    });

    expect(result).toMatchObject({ status: "updated", run: { currentStepId: step.id } });
  });

  it("serializes concurrent asset head commits", async () => {
    const repositories = createInMemoryAssetRepositories();
    let sequence = 0;
    const administration = createAssetAdministration({
      repositories,
      now: () => new Date("2026-08-24T04:00:00.000Z"),
      id: () => `concurrent-${++sequence}`,
    });
    const asset = await administration.create({
      workspaceId: "workspace-1",
      path: "docs/concurrent.md",
    });
    const input = {
      actorId: "user-1",
      assetId: asset.id,
      workspaceId: asset.workspaceId,
      blobHash: "abcdef0123456789",
      byteSize: 10,
      expectedHeadVersionId: null,
      parentVersionId: null,
    } as const;

    const results = await Promise.allSettled([
      administration.commitVersion({ ...input, idempotencyKey: "concurrent-a" }),
      administration.commitVersion({ ...input, idempotencyKey: "concurrent-b" }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(repositories.versions.versions.size).toBe(1);
    expect(repositories.conflicts.conflicts.size).toBe(1);
  });

  it("replays concurrent commits that share an idempotency key", async () => {
    const repositories = createInMemoryAssetRepositories();
    let sequence = 0;
    const administration = createAssetAdministration({
      repositories,
      now: () => new Date("2026-08-24T05:00:00.000Z"),
      id: () => `replay-${++sequence}`,
    });
    const asset = await administration.create({
      workspaceId: "workspace-1",
      path: "docs/replay.md",
    });
    const input = {
      actorId: "user-1",
      assetId: asset.id,
      workspaceId: asset.workspaceId,
      blobHash: "abcdef0123456789",
      byteSize: 10,
      expectedHeadVersionId: null,
      parentVersionId: null,
      idempotencyKey: "same-concurrent-key",
    } as const;

    const results = await Promise.all([
      administration.commitVersion(input),
      administration.commitVersion(input),
    ]);

    expect(results[1]?.version.id).toBe(results[0]?.version.id);
    expect(repositories.versions.versions.size).toBe(1);
    expect(repositories.conflicts.conflicts.size).toBe(0);
  });

  it("resolves a sync conflict only once under concurrent requests", async () => {
    const repositories = createInMemoryAssetRepositories();
    let sequence = 0;
    const administration = createAssetAdministration({
      repositories,
      now: () => new Date("2026-08-24T06:00:00.000Z"),
      id: () => `conflict-${++sequence}`,
    });
    const asset = await administration.create({
      workspaceId: "workspace-1",
      path: "docs/conflict.md",
    });
    const conflict = await administration.recordConflict({
      workspaceId: asset.workspaceId,
      assetId: asset.id,
      expectedHeadVersionId: null,
      actualHeadVersionId: "remote-1",
    });

    const results = await Promise.allSettled([
      administration.resolveConflict({ conflictId: conflict.id, actorId: "user-1" }),
      administration.resolveConflict({ conflictId: conflict.id, actorId: "user-2" }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  });
});

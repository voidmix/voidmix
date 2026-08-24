import type { AuditEvent, User } from "@voidmix/domain";
import { describe, expect, it } from "vite-plus/test";

import { InMemorySystemSettingsRepository, InMemoryUserRepository } from "./memory.js";

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

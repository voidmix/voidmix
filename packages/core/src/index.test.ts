import { describe, expect, it } from "vite-plus/test";
import {
  createAuthSettingsAdministration,
  createDefaultAuthSettings,
  createMailSettingsAdministration,
  createUserAdministration,
  type AuditEvent,
  type AuthSettings,
  type AuthSettingsView,
  type MailSettings,
  type MailSettingsFallback,
  type SystemSettingsRepository,
  type User,
  type UserRepository,
} from "./index";

function repository(seed: User[]): UserRepository {
  const users = new Map(seed.map((user) => [user.id, user]));
  const audit: AuditEvent[] = [];
  return {
    async list() {
      return { items: [...users.values()], total: users.size, nextCursor: null };
    },
    async getById(id) {
      return users.get(id) ?? null;
    },
    async getByEmail(email) {
      return [...users.values()].find((user) => user.email === email) ?? null;
    },
    async countActiveAdministrators() {
      return [...users.values()].filter(
        (user) => user.status === "active" && (user.role === "admin" || user.role === "owner"),
      ).length;
    },
    async save(user) {
      users.set(user.id, user);
    },
    async updateStatus(id, status) {
      const current = users.get(id);
      if (!current) throw new Error("missing user");
      const updated = { ...current, status };
      users.set(id, updated);
      return updated;
    },
    async appendAudit(event) {
      audit.push(event);
    },
    async listAudit() {
      return audit;
    },
  };
}

const admin: User = {
  id: "usr_admin",
  email: "admin@voidmix.local",
  displayName: "Admin",
  role: "admin",
  status: "active",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("user administration", () => {
  it("prevents an administrator from suspending themselves", async () => {
    const service = createUserAdministration({ users: repository([admin]) });
    await expect(
      service.updateStatus({ actorId: admin.id, userId: admin.id, status: "suspended" }),
    ).rejects.toMatchObject({ code: "SELF_SUSPENSION" });
  });

  it("keeps the final active administrator from being suspended", async () => {
    const service = createUserAdministration({ users: repository([admin]) });

    await expect(
      service.updateStatus({ actorId: "operator", userId: admin.id, status: "suspended" }),
    ).rejects.toMatchObject({ code: "LAST_ADMIN" });
  });

  it("creates an initial administrator idempotently", async () => {
    const service = createUserAdministration({ users: repository([]), id: () => "usr_created" });
    const first = await service.ensureAdmin({ email: admin.email, displayName: admin.displayName });
    const second = await service.ensureAdmin({
      email: admin.email,
      displayName: admin.displayName,
    });
    expect(second.id).toBe(first.id);
  });
});

describe("mail settings administration", () => {
  const fallback: MailSettingsFallback = {
    enabled: { value: true, source: "default" },
    from: { value: null, source: "missing" },
    fromName: { value: "Voidmix", source: "default" },
    templatesBaseUrl: { value: null, source: "missing" },
    resendApiKey: { value: null, source: "missing" },
  };

  it("rejects invalid typed mail settings before persistence", async () => {
    const updateMailSettings = async (): Promise<MailSettings> => {
      throw new Error("must not persist");
    };
    const settings = settingsRepository({ updateMailSettings });
    const service = createMailSettingsAdministration({ settings, fallback });

    await expect(
      service.update({
        actorId: "admin-1",
        settings: {
          from: { action: "set", value: "invalid-email" },
        },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("records only recipient and result after a successful test delivery", async () => {
    const audit: AuditEvent[] = [];
    const sendTest = async () => {};
    const service = createMailSettingsAdministration({
      settings: settingsRepository({ audit }),
      fallback: {
        ...fallback,
        from: { value: "mail@example.com", source: "environment" },
        resendApiKey: { value: "key", source: "environment" },
      },
      sendTest,
      now: () => new Date("2026-08-24T00:00:00.000Z"),
      id: () => "audit-mail-test",
    });

    await service.sendTest({
      actorId: "admin-1",
      recipient: { email: "admin@example.com", name: "Admin" },
    });

    expect(audit).toEqual([
      expect.objectContaining({
        action: "system.mail.test.sent",
        targetType: "system_setting",
        targetId: "mail",
        metadata: { recipient: "admin@example.com", result: "sent" },
      }),
    ]);
    expect(JSON.stringify(audit)).not.toContain("key");
  });
});

describe("auth settings administration", () => {
  it("normalizes and deduplicates allowed email domains before persistence", async () => {
    let persisted: AuthSettingsView | undefined;
    let audit: AuditEvent | undefined;
    const service = createAuthSettingsAdministration({
      settings: settingsRepository({
        updateAuthSettings: async (input) => {
          audit = input.audit;
          const domains =
            input.settings.allowedEmailDomains?.action === "set"
              ? input.settings.allowedEmailDomains.value
              : [];
          persisted = authSettingsView({
            ...createDefaultAuthSettings(),
            allowedEmailDomains: domains,
            updatedAt: input.audit.occurredAt,
          });
          return persisted;
        },
      }),
      now: () => new Date("2026-08-24T01:00:00.000Z"),
      id: () => "audit-auth",
    });

    await service.update({
      actorId: "owner-1",
      settings: {
        allowedEmailDomains: {
          action: "set",
          value: [" Example.COM ", "example.com", "studio.example"],
        },
      },
    });

    expect(persisted?.allowedEmailDomains).toEqual(["example.com", "studio.example"]);
    expect(audit).toMatchObject({
      action: "system.settings.updated",
      targetType: "system_setting",
      targetId: "auth",
    });
  });

  it("rejects malformed allowed email domains", async () => {
    const service = createAuthSettingsAdministration({ settings: settingsRepository({}) });

    await expect(
      service.update({
        actorId: "owner-1",
        settings: {
          allowedEmailDomains: { action: "set", value: ["https://example.com"] },
        },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

function settingsRepository(options: {
  audit?: AuditEvent[];
  updateAuthSettings?: SystemSettingsRepository["updateAuthSettings"];
  updateMailSettings?: SystemSettingsRepository["updateMailSettings"];
}): SystemSettingsRepository {
  async function getMailSettings(fallback: MailSettingsFallback): Promise<MailSettings> {
    const missing: MailSettings["missing"] = [];
    if (!fallback.resendApiKey.value) missing.push("RESEND_API_KEY");
    if (!fallback.from.value) missing.push("MAIL_FROM");
    return {
      enabled: fallback.enabled.value,
      from: fallback.from.value,
      fromName: fallback.fromName.value,
      templatesBaseUrl: fallback.templatesBaseUrl.value,
      sources: {
        enabled: fallback.enabled.source,
        from: fallback.from.source,
        fromName: fallback.fromName.source,
        templatesBaseUrl: fallback.templatesBaseUrl.source,
      },
      inherited: {
        enabled: { ...fallback.enabled },
        from: { ...fallback.from },
        fromName: { ...fallback.fromName },
        templatesBaseUrl: { ...fallback.templatesBaseUrl },
      },
      resendApiKey: {
        configured: Boolean(fallback.resendApiKey.value),
        source: fallback.resendApiKey.value ? "environment" : "missing",
        inheritedConfigured: Boolean(fallback.resendApiKey.value),
      },
      configurationState: missing.length === 0 ? "ready" : "incomplete",
      missing,
      updatedAt: null,
    };
  }

  return {
    async getAuthSettings() {
      return authSettingsView(createDefaultAuthSettings());
    },
    async resolveAuthSettings() {
      return createDefaultAuthSettings();
    },
    updateAuthSettings:
      options.updateAuthSettings ??
      (async ({ audit }) =>
        authSettingsView({ ...createDefaultAuthSettings(), updatedAt: audit.occurredAt })),
    getMailSettings,
    async resolveMailConfiguration(fallback) {
      return {
        settings: {
          enabled: fallback.enabled.value,
          from: fallback.from.value,
          fromName: fallback.fromName.value,
          templatesBaseUrl: fallback.templatesBaseUrl.value,
          configurationState: (await getMailSettings(fallback)).configurationState,
          missing: (await getMailSettings(fallback)).missing,
        },
        resendApiKey: fallback.resendApiKey.value,
      };
    },
    updateMailSettings:
      options.updateMailSettings ??
      (async ({ fallback }) => {
        return getMailSettings(fallback);
      }),
    async appendMailTestAudit(event) {
      options.audit?.push(event);
    },
  };
}

function authSettingsView(settings: AuthSettings): AuthSettingsView {
  const defaults = createDefaultAuthSettings();
  return {
    ...settings,
    sources: {
      registrationMode: "default",
      allowedEmailDomains: "default",
      welcomeEmailEnabled: "default",
      verificationEmailEnabled: "default",
      passwordResetEmailEnabled: "default",
    },
    inherited: {
      registrationMode: { value: defaults.registrationMode, source: "default" },
      allowedEmailDomains: { value: defaults.allowedEmailDomains, source: "default" },
      welcomeEmailEnabled: { value: defaults.welcomeEmailEnabled, source: "default" },
      verificationEmailEnabled: {
        value: defaults.verificationEmailEnabled,
        source: "default",
      },
      passwordResetEmailEnabled: {
        value: defaults.passwordResetEmailEnabled,
        source: "default",
      },
    },
  };
}

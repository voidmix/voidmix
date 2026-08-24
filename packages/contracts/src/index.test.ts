import { describe, expect, it } from "vite-plus/test";

import { authSettingsSchema, mailSettingsSchema, userSchema } from "./index.js";

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

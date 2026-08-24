import type { ApiClient } from "@voidmix/client";
import { describe, expect, it, vi } from "vite-plus/test";

import { createApiAuthSettingsAdapter } from "./auth-api-adapter";

describe("admin auth settings API adapter", () => {
  it("uses the typed auth settings procedures without a fallback", async () => {
    const settings = {
      registrationMode: "open" as const,
      allowedEmailDomains: ["example.com"],
      welcomeEmailEnabled: true,
      verificationEmailEnabled: true,
      passwordResetEmailEnabled: true,
      sources: {
        registrationMode: "database" as const,
        allowedEmailDomains: "database" as const,
        welcomeEmailEnabled: "default" as const,
        verificationEmailEnabled: "default" as const,
        passwordResetEmailEnabled: "default" as const,
      },
      inherited: {
        registrationMode: { value: "open" as const, source: "default" as const },
        allowedEmailDomains: { value: [], source: "default" as const },
        welcomeEmailEnabled: { value: true, source: "default" as const },
        verificationEmailEnabled: { value: true, source: "default" as const },
        passwordResetEmailEnabled: { value: true, source: "default" as const },
      },
      updatedAt: new Date("2026-08-24T01:00:00.000Z"),
    };
    const get = vi.fn(async () => settings);
    const update = vi.fn(async () => settings);
    const api = {
      admin: { settings: { auth: { get, update } } },
    } as unknown as ApiClient;
    const adapter = createApiAuthSettingsAdapter(api);

    await expect(adapter.get()).resolves.toEqual(settings);
    await adapter.update({
      registrationMode: { action: "reset" },
      allowedEmailDomains: { action: "set", value: ["example.com"] },
    });

    expect(get).toHaveBeenCalledWith({});
    expect(update).toHaveBeenCalledWith({
      registrationMode: { action: "reset" },
      allowedEmailDomains: { action: "set", value: ["example.com"] },
    });
  });
});

import type { ApiClient } from "@voidmix/client";
import { describe, expect, it, vi } from "vite-plus/test";

import { createApiMailSettingsAdapter } from "./api-adapter";

describe("admin mail settings API adapter", () => {
  it("uses the typed mail procedures without a fallback", async () => {
    const settings = {
      enabled: true,
      from: "mail@example.com",
      fromName: "Voidmix",
      templatesBaseUrl: null,
      sources: {
        enabled: "default" as const,
        from: "database" as const,
        fromName: "default" as const,
        templatesBaseUrl: "missing" as const,
      },
      inherited: {
        enabled: { value: true, source: "default" as const },
        from: { value: "environment@example.com", source: "environment" as const },
        fromName: { value: "Voidmix", source: "default" as const },
        templatesBaseUrl: { value: null, source: "missing" as const },
      },
      resendApiKey: {
        configured: true,
        source: "environment" as const,
        inheritedConfigured: true,
      },
      configurationState: "ready" as const,
      missing: [],
      updatedAt: new Date("2026-08-24T00:00:00.000Z"),
    };
    const get = vi.fn(async () => settings);
    const update = vi.fn(async () => settings);
    const sendTest = vi.fn(async () => ({
      sent: true as const,
      recipient: "admin@example.com",
      occurredAt: new Date("2026-08-24T00:01:00.000Z"),
    }));
    const api = {
      admin: { settings: { mail: { get, update, sendTest } } },
    } as unknown as ApiClient;
    const adapter = createApiMailSettingsAdapter(api);

    await expect(adapter.get()).resolves.toEqual(settings);
    await adapter.update({
      from: { action: "set", value: "mail@example.com" },
      templatesBaseUrl: { action: "reset" },
    });
    await expect(adapter.sendTest()).resolves.toMatchObject({ recipient: "admin@example.com" });

    expect(get).toHaveBeenCalledWith({});
    expect(update).toHaveBeenCalledWith({
      from: { action: "set", value: "mail@example.com" },
      templatesBaseUrl: { action: "reset" },
    });
    expect(sendTest).toHaveBeenCalledWith({});
  });
});

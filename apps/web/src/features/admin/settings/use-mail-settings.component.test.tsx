/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import type { AdminMailSettingsClient, MailSettings } from "./api-adapter";
import { useMailSettings } from "./use-mail-settings";

const settings: MailSettings = {
  enabled: true,
  from: "database@example.com",
  fromName: "Voidmix",
  templatesBaseUrl: null,
  sources: {
    enabled: "default",
    from: "database",
    fromName: "default",
    templatesBaseUrl: "missing",
  },
  inherited: {
    enabled: { value: true, source: "default" },
    from: { value: "environment@example.com", source: "environment" },
    fromName: { value: "Voidmix", source: "default" },
    templatesBaseUrl: { value: null, source: "missing" },
  },
  resendApiKey: {
    configured: true,
    source: "database",
    inheritedConfigured: true,
  },
  configurationState: "ready",
  missing: [],
  updatedAt: new Date("2026-08-24T00:00:00.000Z"),
};

function createClient(update = vi.fn(async () => settings)): AdminMailSettingsClient {
  return {
    get: async () => settings,
    update,
    sendTest: async () => ({
      sent: true,
      recipient: "admin@example.com",
      occurredAt: new Date("2026-08-24T00:01:00.000Z"),
    }),
  };
}

describe("useMailSettings", () => {
  it("keeps an untouched form and blank secret input out of updates", async () => {
    const update = vi.fn(async () => settings);
    const client = createClient(update);
    const { result } = renderHook(() => useMailSettings(client));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.hasChanges).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("submits only the ordinary field that changed", async () => {
    const update = vi.fn(async () => settings);
    const client = createClient(update);
    const { result } = renderHook(() => useMailSettings(client));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.updateForm("fromName", "Voidmix Mail"));
    await act(async () => {
      await result.current.save();
    });

    expect(update).toHaveBeenCalledWith({
      fromName: { action: "set", value: "Voidmix Mail" },
    });
  });

  it("turns clearing or restoring an ordinary field into reset", async () => {
    const update = vi.fn(async () => settings);
    const client = createClient(update);
    const { result } = renderHook(() => useMailSettings(client));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.updateForm("from", ""));
    expect(result.current.changes).toEqual({ from: { action: "reset" } });

    act(() => result.current.resetField("from"));
    expect(result.current.form.from).toBe("environment@example.com");
    await act(async () => {
      await result.current.save();
    });

    expect(update).toHaveBeenCalledWith({ from: { action: "reset" } });
  });

  it("distinguishes secret replacement, retention, and reset", async () => {
    const update = vi.fn(async () => settings);
    const client = createClient(update);
    const { result } = renderHook(() => useMailSettings(client));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.updateSecret("new-secret"));
    expect(result.current.changes).toEqual({
      resendApiKey: { action: "replace", value: "new-secret" },
    });

    act(() => result.current.updateSecret(""));
    expect(result.current.changes).toEqual({});

    act(() => result.current.resetSecret());
    await act(async () => {
      await result.current.save();
    });

    expect(update).toHaveBeenCalledWith({ resendApiKey: { action: "reset" } });
  });
});

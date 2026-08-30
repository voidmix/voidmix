/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import type { AdminAuthSettingsClient, AuthSettings } from "../auth-api-adapter";
import { useAuthSettings } from "../use-auth-settings";

const settings: AuthSettings = {
  registrationMode: "closed",
  allowedEmailDomains: ["example.com"],
  welcomeEmailEnabled: true,
  verificationEmailEnabled: true,
  passwordResetEmailEnabled: true,
  sources: {
    registrationMode: "database",
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
  updatedAt: new Date("2026-08-24T01:00:00.000Z"),
};

function createClient(update = vi.fn(async () => settings)): AdminAuthSettingsClient {
  return { get: async () => settings, update };
}

describe("useAuthSettings", () => {
  it("does not update an untouched form", async () => {
    const update = vi.fn(async () => settings);
    const client = createClient(update);
    const { result } = renderHook(() => useAuthSettings(client));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.hasChanges).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("converts a changed domain list to one typed set mutation", async () => {
    const update = vi.fn(async () => settings);
    const client = createClient(update);
    const { result } = renderHook(() => useAuthSettings(client));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.updateForm("allowedEmailDomains", "example.com, studio.example\n"));
    await act(async () => {
      await result.current.save();
    });

    expect(update).toHaveBeenCalledWith({
      allowedEmailDomains: {
        action: "set",
        value: ["example.com", "studio.example"],
      },
    });
  });

  it("keeps an empty domain list as a deliberate set operation", async () => {
    const update = vi.fn(async () => settings);
    const client = createClient(update);
    const { result } = renderHook(() => useAuthSettings(client));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.updateForm("allowedEmailDomains", ""));

    expect(result.current.changes).toEqual({
      allowedEmailDomains: { action: "set", value: [] },
    });
  });

  it("restores a database override without persisting the inherited value", async () => {
    const update = vi.fn(async () => settings);
    const client = createClient(update);
    const { result } = renderHook(() => useAuthSettings(client));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.resetField("registrationMode"));
    expect(result.current.form.registrationMode).toBe("open");
    await act(async () => {
      await result.current.save();
    });

    expect(update).toHaveBeenCalledWith({ registrationMode: { action: "reset" } });
  });
});

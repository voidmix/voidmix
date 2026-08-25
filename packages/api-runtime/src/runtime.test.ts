import { describe, expect, it, vi } from "vite-plus/test";
import { createDefaultAuthSettings, type AuthSettings } from "@voidmix/domain";

import { createMailProtectedAuthHandler } from "./runtime.js";

describe("mail-protected Better Auth operations", () => {
  it.each([
    "/api/auth/sign-up/email",
    "/api/auth/request-password-reset",
    "/api/auth/send-verification-email",
  ])("returns a stable 503 for %s when mail is unavailable", async (path) => {
    const handler = vi.fn(async () => new Response("auth-ok"));
    const guarded = createMailProtectedAuthHandler({
      handler,
      getAuthSettings: async () => createDefaultAuthSettings(),
      getMailSettings: async () => ({ configurationState: "incomplete" }),
    });

    const response = await guarded(new Request(`http://voidmix.test${path}`, { method: "POST" }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: "MAIL_NOT_CONFIGURED",
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not block verified-user login", async () => {
    const handler = vi.fn(async () => new Response("auth-ok"));
    const guarded = createMailProtectedAuthHandler({
      handler,
      getAuthSettings: async () => createDefaultAuthSettings(),
      getMailSettings: async () => ({ configurationState: "incomplete" }),
    });

    const response = await guarded(
      new Request("http://voidmix.test/api/auth/sign-in/email", { method: "POST" }),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("auth-ok");
  });

  it("applies registration changes without rebuilding the handler", async () => {
    let settings: AuthSettings = createDefaultAuthSettings();
    const handler = vi.fn(async () => new Response("auth-ok"));
    const guarded = createMailProtectedAuthHandler({
      handler,
      getAuthSettings: async () => settings,
      getMailSettings: async () => ({ configurationState: "ready" }),
    });
    const request = () =>
      new Request("http://voidmix.test/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "person@example.com", password: "password123" }),
      });

    expect((await guarded(request())).status).toBe(200);
    settings = { ...settings, registrationMode: "closed" };

    const response = await guarded(request());
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "REGISTRATION_DISABLED" });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("enforces an exact, case-insensitive allowed email domain list", async () => {
    const handler = vi.fn(async () => new Response("auth-ok"));
    const guarded = createMailProtectedAuthHandler({
      handler,
      getAuthSettings: async () => ({
        ...createDefaultAuthSettings(),
        allowedEmailDomains: ["example.com"],
      }),
      getMailSettings: async () => ({ configurationState: "ready" }),
    });

    const rejected = await guarded(
      new Request("http://voidmix.test/api/auth/sign-up/email", {
        method: "POST",
        body: JSON.stringify({ email: "person@other.example" }),
      }),
    );
    const accepted = await guarded(
      new Request("http://voidmix.test/api/auth/sign-up/email", {
        method: "POST",
        body: JSON.stringify({ email: "PERSON@EXAMPLE.COM" }),
      }),
    );

    expect(rejected.status).toBe(400);
    expect(await rejected.json()).toMatchObject({ code: "EMAIL_DOMAIN_NOT_ALLOWED" });
    expect(accepted.status).toBe(200);
  });

  it.each([
    {
      path: "/api/auth/send-verification-email",
      setting: "verificationEmailEnabled" as const,
      code: "EMAIL_VERIFICATION_DISABLED",
    },
    {
      path: "/api/auth/request-password-reset",
      setting: "passwordResetEmailEnabled" as const,
      code: "PASSWORD_RESET_DISABLED",
    },
  ])("blocks $path when its delivery policy is disabled", async ({ path, setting, code }) => {
    const handler = vi.fn(async () => new Response("auth-ok"));
    const guarded = createMailProtectedAuthHandler({
      handler,
      getAuthSettings: async () => ({ ...createDefaultAuthSettings(), [setting]: false }),
      getMailSettings: async () => ({ configurationState: "ready" }),
    });

    const response = await guarded(new Request(`http://voidmix.test${path}`, { method: "POST" }));

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code });
    expect(handler).not.toHaveBeenCalled();
  });
});

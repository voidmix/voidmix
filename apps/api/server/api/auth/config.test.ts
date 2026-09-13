import { createDefaultAuthSettings } from "@voidmix/core";
import type { Mailer } from "@voidmix/mail/types";
import { describe, expect, it, vi } from "vite-plus/test";

import { recipientLocale, sendWelcomeEmailIfEnabled } from "./config.js";

function mailer(sendWelcome: Mailer["sendWelcome"]): Mailer {
  return {
    sendVerification: async () => {},
    sendPasswordReset: async () => {},
    sendWelcome,
    sendTest: async () => {},
  };
}

describe("welcome email policy", () => {
  it("uses an explicit request locale without inventing a fallback", () => {
    expect(
      recipientLocale(
        new Request("https://voidmix.test/api/auth", {
          headers: { "accept-language": "zh-CN, en;q=0.8" },
        }),
      ),
    ).toEqual({ locale: "zh" });
    expect(recipientLocale(new Request("https://voidmix.test/api/auth"))).toEqual({});
    expect(recipientLocale(undefined)).toEqual({});
  });

  it("gives the locale cookie precedence over Accept-Language", () => {
    expect(
      recipientLocale(
        new Request("https://voidmix.test/api/auth", {
          headers: {
            cookie: "locale=en",
            "accept-language": "zh-CN",
          },
        }),
      ),
    ).toEqual({ locale: "en" });
  });

  it("skips welcome delivery when the dynamic setting is disabled", async () => {
    const sendWelcome = vi.fn(async () => {});

    await sendWelcomeEmailIfEnabled({
      user: { email: "person@example.com", name: "Person" },
      mailer: mailer(sendWelcome),
      getAuthSettings: async () => ({
        ...createDefaultAuthSettings(),
        welcomeEmailEnabled: false,
      }),
    });

    expect(sendWelcome).not.toHaveBeenCalled();
  });

  it("sends welcome mail when the dynamic setting is enabled", async () => {
    const sendWelcome = vi.fn(async () => {});

    await sendWelcomeEmailIfEnabled({
      user: { email: "person@example.com", name: "Person" },
      mailer: mailer(sendWelcome),
      getAuthSettings: async () => createDefaultAuthSettings(),
    });

    expect(sendWelcome).toHaveBeenCalledWith({
      email: "person@example.com",
      name: "Person",
    });
  });

  it("forwards the recipient locale to the mailer", async () => {
    const sendWelcome = vi.fn(async () => {});

    await sendWelcomeEmailIfEnabled({
      user: { email: "person@example.com", name: "Person" },
      mailer: mailer(sendWelcome),
      getAuthSettings: async () => createDefaultAuthSettings(),
      locale: "zh",
    });

    expect(sendWelcome).toHaveBeenCalledWith({
      email: "person@example.com",
      name: "Person",
      locale: "zh",
    });
  });

  it("omits the locale entirely when none was resolved", async () => {
    const sendWelcome = vi.fn<Mailer["sendWelcome"]>(async () => {});

    await sendWelcomeEmailIfEnabled({
      user: { email: "person@example.com", name: "Person" },
      mailer: mailer(sendWelcome),
      getAuthSettings: async () => createDefaultAuthSettings(),
    });

    // Not `locale: undefined` — the mailer's fallback depends on the property
    // being absent, and `exactOptionalPropertyTypes` forbids the explicit form.
    expect(Object.keys(sendWelcome.mock.calls[0]![0])).toEqual(["email", "name"]);
  });
});

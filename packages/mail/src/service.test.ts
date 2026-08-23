import { describe, expect, it, vi } from "vite-plus/test";

import { getMailEnv } from "./env.js";
import { createMailer } from "./service.js";
import type { MailTransport } from "./types.js";

const developmentEnv = getMailEnv({
  NODE_ENV: "development",
  MAIL_FROM: "mail@example.com",
  MAIL_FROM_NAME: "Voidmix",
  EMAIL_TEMPLATES_BASE_URL: "https://admin.example.com",
});

describe("mailer", () => {
  it("renders and sends each typed authentication email", async () => {
    const send = vi.fn<MailTransport["send"]>(async () => ({ ok: true, id: "sent" }));
    const mailer = createMailer({ env: developmentEnv, transport: { send } });

    await mailer.sendVerification({
      email: "alex@example.com",
      name: "Alex",
      url: "https://admin.example.com/verify?token=private",
    });
    await mailer.sendPasswordReset({
      email: "alex@example.com",
      url: "https://admin.example.com/reset?token=private",
    });
    await mailer.sendWelcome({ email: "alex@example.com", name: "Alex" });

    expect(send).toHaveBeenCalledTimes(3);
    expect(send.mock.calls.map(([value]) => value.template)).toEqual([
      "email-verification",
      "password-reset",
      "welcome",
    ]);
    expect(send.mock.calls[0]?.[0]).toMatchObject({
      from: { email: "mail@example.com", name: "Voidmix" },
      to: { email: "alex@example.com", name: "Alex" },
    });
  });

  it("surfaces transport failures", async () => {
    const mailer = createMailer({
      env: developmentEnv,
      transport: { send: async () => ({ ok: false, error: "provider rejected message" }) },
    });

    await expect(mailer.sendWelcome({ email: "alex@example.com", name: "Alex" })).rejects.toThrow(
      "Failed to send welcome email: provider rejected message",
    );
  });
});

describe("mail environment", () => {
  it("uses a network-free development fallback configuration", () => {
    expect(getMailEnv({ NODE_ENV: "test" })).toMatchObject({
      NODE_ENV: "test",
      MAIL_FROM: "noreply@voidmix.local",
      MAIL_FROM_NAME: "Voidmix",
    });
  });

  it("requires Resend and sender configuration in production", () => {
    expect(() => getMailEnv({ NODE_ENV: "production" })).toThrow(
      "Production mail configuration is missing: RESEND_API_KEY, MAIL_FROM",
    );
    expect(() =>
      getMailEnv({
        NODE_ENV: "production",
        RESEND_API_KEY: "resend-key",
        MAIL_FROM: "mail@example.com",
      }),
    ).not.toThrow();
  });
});

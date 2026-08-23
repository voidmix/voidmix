import { getMailEnv, type MailEnvironment } from "./env.js";
import { passwordResetEmail, verificationEmail, welcomeEmail } from "./templates/index.js";
import { createLoggerTransport, createResendTransport } from "./transports/index.js";
import type { MailAddress, Mailer, MailMessage, MailTemplateKind, MailTransport } from "./types.js";

export type CreateMailerOptions = {
  env?: MailEnvironment;
  transport?: MailTransport;
};

function address(email: string, name?: string | null): MailAddress {
  return { email, ...(name?.trim() ? { name: name.trim() } : {}) };
}

export function createMailer(options: CreateMailerOptions = {}): Mailer {
  const env = options.env ?? getMailEnv();
  const transport =
    options.transport ??
    (env.RESEND_API_KEY
      ? createResendTransport({ apiKey: env.RESEND_API_KEY })
      : createLoggerTransport());
  const from = { email: env.MAIL_FROM, name: env.MAIL_FROM_NAME };

  async function deliver(
    template: MailTemplateKind,
    to: MailAddress,
    rendered: { subject: string; html: string; text: string },
  ): Promise<void> {
    const message: MailMessage = { template, from, to, ...rendered };
    const result = await transport.send(message);
    if (!result.ok) throw new Error(`Failed to send ${template} email: ${result.error}`);
  }

  return {
    async sendVerification(input) {
      const rendered = await verificationEmail({
        ...input,
        ...(env.EMAIL_TEMPLATES_BASE_URL ? { baseUrl: env.EMAIL_TEMPLATES_BASE_URL } : {}),
      });
      await deliver("email-verification", address(input.email, input.name), rendered);
    },
    async sendPasswordReset(input) {
      const rendered = await passwordResetEmail({
        ...input,
        ...(env.EMAIL_TEMPLATES_BASE_URL ? { baseUrl: env.EMAIL_TEMPLATES_BASE_URL } : {}),
      });
      await deliver("password-reset", address(input.email, input.name), rendered);
    },
    async sendWelcome(input) {
      const rendered = await welcomeEmail({
        ...input,
        ...(env.EMAIL_TEMPLATES_BASE_URL ? { appUrl: env.EMAIL_TEMPLATES_BASE_URL } : {}),
      });
      await deliver("welcome", address(input.email, input.name), rendered);
    },
  };
}

import { getMailEnv, type MailEnvironment } from "./env.js";
import { passwordResetEmail, verificationEmail, welcomeEmail } from "./templates/index.js";
import { createLoggerTransport, createResendTransport } from "./transports/index.js";
import type {
  MailAddress,
  Mailer,
  MailMessage,
  MailTemplateKind,
  MailTransport,
  MissingMailConfiguration,
  ResolvedMailConfiguration,
} from "./types.js";

export type CreateMailerOptions = {
  env?: MailEnvironment;
  transport?: MailTransport;
  resolveConfiguration?: () => Promise<ResolvedMailConfiguration>;
  createResend?: (apiKey: string) => MailTransport;
  loggerTransport?: MailTransport;
};

export class MailUnavailableError extends Error {
  readonly code = "MAIL_NOT_CONFIGURED";

  constructor(public readonly missing: MissingMailConfiguration[]) {
    super("Mail configuration is not ready.");
    this.name = "MailUnavailableError";
  }
}

function address(email: string, name?: string | null): MailAddress {
  return { email, ...(name?.trim() ? { name: name.trim() } : {}) };
}

export function createMailer(options: CreateMailerOptions = {}): Mailer {
  const env = options.env ?? getMailEnv();
  const resolveConfiguration =
    options.resolveConfiguration ?? (async () => configurationFromEnvironment(env));
  const createResend = options.createResend ?? ((apiKey) => createResendTransport({ apiKey }));
  const loggerTransport = options.loggerTransport ?? createLoggerTransport();

  async function deliver(
    template: MailTemplateKind,
    to: MailAddress,
    render: (configuration: ResolvedMailConfiguration) => Promise<{
      subject: string;
      html: string;
      text: string;
    }>,
  ): Promise<void> {
    const configuration = await resolveConfiguration();
    const missing = missingConfiguration(configuration);
    if (!configuration.enabled || (env.NODE_ENV === "production" && missing.length > 0)) {
      throw new MailUnavailableError(missing);
    }

    const rendered = await render(configuration);
    const from = configuration.from ?? "noreply@voidmix.local";
    const message: MailMessage = {
      template,
      from: { email: from, name: configuration.fromName },
      to,
      ...rendered,
    };
    const transport =
      options.transport ??
      (configuration.resendApiKey ? createResend(configuration.resendApiKey) : loggerTransport);
    const result = await transport.send(message);
    if (!result.ok) throw new Error(`Failed to send ${template} email: ${result.error}`);
  }

  return {
    async sendVerification(input) {
      await deliver("email-verification", address(input.email, input.name), (configuration) =>
        verificationEmail({
          ...input,
          ...(configuration.templatesBaseUrl ? { baseUrl: configuration.templatesBaseUrl } : {}),
        }),
      );
    },
    async sendPasswordReset(input) {
      await deliver("password-reset", address(input.email, input.name), (configuration) =>
        passwordResetEmail({
          ...input,
          ...(configuration.templatesBaseUrl ? { baseUrl: configuration.templatesBaseUrl } : {}),
        }),
      );
    },
    async sendWelcome(input) {
      await deliver("welcome", address(input.email, input.name), (configuration) =>
        welcomeEmail({
          ...input,
          ...(configuration.templatesBaseUrl ? { appUrl: configuration.templatesBaseUrl } : {}),
        }),
      );
    },
    async sendTest(input) {
      await deliver("test", address(input.email, input.name), async () => ({
        subject: "Voidmix mail configuration test",
        html: "<p>Your Voidmix mail configuration is working.</p>",
        text: "Your Voidmix mail configuration is working.",
      }));
    },
  };
}

function configurationFromEnvironment(env: MailEnvironment): ResolvedMailConfiguration {
  return {
    enabled: true,
    from: env.MAIL_FROM,
    fromName: env.MAIL_FROM_NAME,
    templatesBaseUrl: env.EMAIL_TEMPLATES_BASE_URL ?? null,
    resendApiKey: env.RESEND_API_KEY ?? null,
  };
}

function missingConfiguration(
  configuration: ResolvedMailConfiguration,
): MissingMailConfiguration[] {
  const missing: MissingMailConfiguration[] = [];
  if (!configuration.resendApiKey) missing.push("RESEND_API_KEY");
  if (!configuration.from) missing.push("MAIL_FROM");
  return missing;
}

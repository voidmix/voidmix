import { DomainError } from "../shared/errors.js";
import { defaultClock, defaultIdGenerator } from "../shared/types.js";
import type {
  AuthSettings,
  AuthSettingsView,
  MailSettings,
  MailSettingsFallback,
  PublicAuthCapabilities,
  SystemSettingsRepository,
  UpdateAuthSettingsInput,
  UpdateMailSettingsInput,
} from "./model.js";

interface MailSettingsAdministrationDependencies {
  settings: SystemSettingsRepository;
  fallback: MailSettingsFallback;
  sendTest?: (input: { email: string; name: string; locale?: string }) => Promise<void>;
  now?: () => Date;
  id?: () => string;
}
export function createMailSettingsAdministration({
  settings,
  fallback,
  sendTest,
  now = () => defaultClock.now(),
  id = () => defaultIdGenerator.next(),
}: MailSettingsAdministrationDependencies) {
  async function requireReady(): Promise<MailSettings> {
    const current = await settings.getMailSettings(fallback);
    if (current.configurationState !== "ready")
      throw new DomainError("MAIL_NOT_CONFIGURED", "Mail configuration is not ready.");
    return current;
  }
  return {
    get: () => settings.getMailSettings(fallback),
    resolve: () => settings.resolveMailConfiguration(fallback),
    async update(input: {
      actorId: string;
      settings: UpdateMailSettingsInput;
    }): Promise<MailSettings> {
      validateMailSettings(input.settings);
      return settings.updateMailSettings({
        actorId: input.actorId,
        settings: input.settings,
        fallback,
        audit: {
          id: id(),
          actorId: input.actorId,
          action: "system.settings.updated",
          targetType: "system_setting",
          targetId: "mail",
          targetUserId: null,
          occurredAt: now(),
          metadata: { result: "updated" },
        },
      });
    },
    async sendTest(input: {
      actorId: string;
      recipient: { email: string; name: string };
      locale?: string;
    }): Promise<{ sent: true; recipient: string; occurredAt: Date }> {
      await requireReady();
      if (!sendTest) throw new Error("Mail test sender is not configured.");
      await sendTest({ ...input.recipient, ...(input.locale ? { locale: input.locale } : {}) });
      const occurredAt = now();
      await settings.appendMailTestAudit({
        id: id(),
        actorId: input.actorId,
        action: "system.mail.test.sent",
        targetType: "system_setting",
        targetId: "mail",
        targetUserId: null,
        occurredAt,
        metadata: { recipient: input.recipient.email, result: "sent" },
      });
      return { sent: true, recipient: input.recipient.email, occurredAt };
    },
    assertReady: requireReady,
  };
}
interface AuthSettingsAdministrationDependencies {
  settings: SystemSettingsRepository;
  now?: () => Date;
  id?: () => string;
}
export function createAuthSettingsAdministration({
  settings,
  now = () => defaultClock.now(),
  id = () => defaultIdGenerator.next(),
}: AuthSettingsAdministrationDependencies) {
  return {
    get: () => settings.getAuthSettings(),
    async update(input: {
      actorId: string;
      settings: UpdateAuthSettingsInput;
    }): Promise<AuthSettingsView> {
      const normalized = normalizeAuthSettings(input.settings);
      return settings.updateAuthSettings({
        actorId: input.actorId,
        settings: normalized,
        audit: {
          id: id(),
          actorId: input.actorId,
          action: "system.settings.updated",
          targetType: "system_setting",
          targetId: "auth",
          targetUserId: null,
          occurredAt: now(),
          metadata: { result: "updated" },
        },
      });
    },
  };
}
export function createPublicAuthCapabilities(options: {
  settings: SystemSettingsRepository;
  mailFallback: MailSettingsFallback;
  resolveAuthSettings?: () => Promise<AuthSettings>;
}) {
  return {
    async get(): Promise<PublicAuthCapabilities> {
      const [auth, mail] = await Promise.all([
        options.resolveAuthSettings?.() ?? options.settings.resolveAuthSettings(),
        options.settings.resolveMailConfiguration(options.mailFallback),
      ]);
      const mailReady = mail.settings.configurationState === "ready";
      return {
        registrationAvailable:
          auth.registrationMode === "open" && auth.verificationEmailEnabled && mailReady,
        verificationEmailRequestAvailable: auth.verificationEmailEnabled && mailReady,
        passwordResetRequestAvailable: auth.passwordResetEmailEnabled && mailReady,
      };
    },
  };
}
function validateMailSettings(input: UpdateMailSettingsInput): void {
  if (input.from?.action === "set" && !isEmail(input.from.value))
    throw new DomainError("BAD_REQUEST", "MAIL_FROM must be a valid email address.");
  if (input.fromName?.action === "set" && !input.fromName.value.trim())
    throw new DomainError("BAD_REQUEST", "MAIL_FROM_NAME must not be empty.");
  if (input.templatesBaseUrl?.action === "set" && !isUrl(input.templatesBaseUrl.value))
    throw new DomainError("BAD_REQUEST", "EMAIL_TEMPLATES_BASE_URL must be a valid URL.");
  if (input.resendApiKey?.action === "replace" && !input.resendApiKey.value.trim())
    throw new DomainError("BAD_REQUEST", "RESEND_API_KEY must not be empty when replacing it.");
}
function normalizeAuthSettings(input: UpdateAuthSettingsInput): UpdateAuthSettingsInput {
  if (input.allowedEmailDomains?.action !== "set") return input;
  if (input.allowedEmailDomains.value.length > 100)
    throw new DomainError("BAD_REQUEST", "At most 100 allowed email domains may be configured.");
  const allowedEmailDomains = [
    ...new Set(input.allowedEmailDomains.value.map((domain) => domain.trim().toLowerCase())),
  ].filter(Boolean);
  for (const domain of allowedEmailDomains)
    if (!isDomain(domain))
      throw new DomainError("BAD_REQUEST", domain + " is not a valid email domain.");
  return { ...input, allowedEmailDomains: { action: "set", value: allowedEmailDomains } };
}
function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
function isUrl(value: string): boolean {
  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(value.trim());
}
function isDomain(value: string): boolean {
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
    value,
  );
}

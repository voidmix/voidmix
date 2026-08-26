import type { Role } from "@voidmix/auth";

export const userStatuses = ["active", "suspended"] as const;
export type UserStatus = (typeof userStatuses)[number];

export type AuditTargetType = "user" | "system_setting";
export type AuditAction =
  | "user.status.changed"
  | "admin.created"
  | "system.settings.updated"
  | "system.mail.test.sent";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  status: UserStatus;
  createdAt: Date;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  targetUserId: string | null;
  occurredAt: Date;
  metadata: Record<string, string>;
}

export interface UserPage {
  items: User[];
  total: number;
  nextCursor: string | null;
}

export interface UserListQuery {
  query?: string;
  limit: number;
  cursor?: string;
}

export type SettingSource = "database" | "environment" | "default" | "missing";
export type InheritedSettingSource = Exclude<SettingSource, "database">;

export interface InheritedSetting<T> {
  value: T;
  source: InheritedSettingSource;
}

export interface SettingMutation<T> {
  action: "set";
  value: T;
}

export interface ResetSettingMutation {
  action: "reset";
}

export type UpdateSetting<T> = SettingMutation<T> | ResetSettingMutation;

export type UpdateSecret = { action: "replace"; value: string } | { action: "reset" };

export interface MailRuntimeSettings {
  enabled: boolean;
  from: string | null;
  fromName: string;
  templatesBaseUrl: string | null;
  configurationState: "ready" | "disabled" | "incomplete";
  missing: Array<"RESEND_API_KEY" | "MAIL_FROM">;
}

export interface MailSettings extends MailRuntimeSettings {
  sources: {
    enabled: SettingSource;
    from: SettingSource;
    fromName: SettingSource;
    templatesBaseUrl: SettingSource;
  };
  inherited: {
    enabled: InheritedSetting<boolean>;
    from: InheritedSetting<string | null>;
    fromName: InheritedSetting<string>;
    templatesBaseUrl: InheritedSetting<string | null>;
  };
  resendApiKey: {
    configured: boolean;
    source: Extract<SettingSource, "database" | "environment" | "missing">;
    inheritedConfigured: boolean;
  };
  updatedAt: Date | null;
}

export interface MailSettingsFallback {
  enabled: InheritedSetting<boolean>;
  from: InheritedSetting<string | null>;
  fromName: InheritedSetting<string>;
  templatesBaseUrl: InheritedSetting<string | null>;
  resendApiKey: InheritedSetting<string | null>;
}

export interface MailRuntimeConfiguration {
  settings: MailRuntimeSettings;
  resendApiKey: string | null;
}

export interface UpdateMailSettingsInput {
  enabled?: UpdateSetting<boolean>;
  from?: UpdateSetting<string>;
  fromName?: UpdateSetting<string>;
  templatesBaseUrl?: UpdateSetting<string>;
  resendApiKey?: UpdateSecret;
}

export const registrationModes = ["open", "closed"] as const;
export type RegistrationMode = (typeof registrationModes)[number];

export interface AuthSettings {
  registrationMode: RegistrationMode;
  allowedEmailDomains: string[];
  welcomeEmailEnabled: boolean;
  verificationEmailEnabled: boolean;
  passwordResetEmailEnabled: boolean;
  updatedAt: Date | null;
}

export interface AuthSettingsView extends AuthSettings {
  sources: {
    registrationMode: SettingSource;
    allowedEmailDomains: SettingSource;
    welcomeEmailEnabled: SettingSource;
    verificationEmailEnabled: SettingSource;
    passwordResetEmailEnabled: SettingSource;
  };
  inherited: {
    registrationMode: InheritedSetting<RegistrationMode>;
    allowedEmailDomains: InheritedSetting<string[]>;
    welcomeEmailEnabled: InheritedSetting<boolean>;
    verificationEmailEnabled: InheritedSetting<boolean>;
    passwordResetEmailEnabled: InheritedSetting<boolean>;
  };
}

export interface UpdateAuthSettingsInput {
  registrationMode?: UpdateSetting<RegistrationMode>;
  allowedEmailDomains?: UpdateSetting<string[]>;
  welcomeEmailEnabled?: UpdateSetting<boolean>;
  verificationEmailEnabled?: UpdateSetting<boolean>;
  passwordResetEmailEnabled?: UpdateSetting<boolean>;
}

export interface PublicAuthCapabilities {
  registrationAvailable: boolean;
  verificationEmailRequestAvailable: boolean;
  passwordResetRequestAvailable: boolean;
}

export function createDefaultAuthSettings(): AuthSettings {
  return {
    registrationMode: "open",
    allowedEmailDomains: [],
    welcomeEmailEnabled: true,
    verificationEmailEnabled: true,
    passwordResetEmailEnabled: true,
    updatedAt: null,
  };
}

export interface SystemSettingsRepository {
  getAuthSettings(): Promise<AuthSettingsView>;
  resolveAuthSettings(): Promise<AuthSettings>;
  updateAuthSettings(input: {
    actorId: string;
    settings: UpdateAuthSettingsInput;
    audit: AuditEvent;
  }): Promise<AuthSettingsView>;
  getMailSettings(fallback: MailSettingsFallback): Promise<MailSettings>;
  resolveMailConfiguration(fallback: MailSettingsFallback): Promise<MailRuntimeConfiguration>;
  updateMailSettings(input: {
    actorId: string;
    settings: UpdateMailSettingsInput;
    fallback: MailSettingsFallback;
    audit: AuditEvent;
  }): Promise<MailSettings>;
  appendMailTestAudit(event: AuditEvent): Promise<void>;
}

export interface UserRepository {
  list(query: UserListQuery): Promise<UserPage>;
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  countActiveAdministrators(): Promise<number>;
  save(user: User): Promise<void>;
  updateStatus(id: string, status: UserStatus): Promise<User>;
  appendAudit(event: AuditEvent): Promise<void>;
  listAudit(limit: number): Promise<AuditEvent[]>;
}

export class DomainError extends Error {
  constructor(
    public readonly code:
      | "USER_NOT_FOUND"
      | "SELF_SUSPENSION"
      | "LAST_ADMIN"
      | "EMAIL_ALREADY_EXISTS"
      | "BAD_REQUEST"
      | "MAIL_NOT_CONFIGURED",
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

interface AdministrationDependencies {
  users: UserRepository;
  now?: () => Date;
  id?: () => string;
}

export function createUserAdministration({
  users,
  now = () => new Date(),
  id = () => `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
}: AdministrationDependencies) {
  return {
    list: (query: UserListQuery) => users.list(query),
    get: (userId: string) => users.getById(userId),
    audit: (limit: number) => users.listAudit(limit),
    async updateStatus(input: {
      actorId: string;
      userId: string;
      status: UserStatus;
    }): Promise<User> {
      const target = await users.getById(input.userId);
      if (!target) {
        throw new DomainError("USER_NOT_FOUND", "The requested user does not exist.");
      }

      if (input.actorId === target.id && input.status === "suspended") {
        throw new DomainError("SELF_SUSPENSION", "Administrators cannot suspend themselves.");
      }

      if (
        input.status === "suspended" &&
        target.status === "active" &&
        (target.role === "admin" || target.role === "owner") &&
        (await users.countActiveAdministrators()) <= 1
      ) {
        throw new DomainError("LAST_ADMIN", "The final active administrator cannot be suspended.");
      }

      if (target.status === input.status) {
        return target;
      }

      const updated = await users.updateStatus(target.id, input.status);
      await users.appendAudit({
        id: id(),
        actorId: input.actorId,
        action: "user.status.changed",
        targetType: "user",
        targetId: target.id,
        targetUserId: target.id,
        occurredAt: now(),
        metadata: { from: target.status, to: input.status },
      });

      return updated;
    },
    async ensureAdmin(input: { email: string; displayName: string }): Promise<User> {
      const existing = await users.getByEmail(input.email);
      if (existing) {
        return existing;
      }

      const admin: User = {
        id: id(),
        email: input.email,
        displayName: input.displayName,
        role: "admin",
        status: "active",
        createdAt: now(),
      };
      await users.save(admin);
      await users.appendAudit({
        id: id(),
        actorId: admin.id,
        action: "admin.created",
        targetType: "user",
        targetId: admin.id,
        targetUserId: admin.id,
        occurredAt: now(),
        metadata: { email: admin.email },
      });
      return admin;
    },
  };
}

interface MailSettingsAdministrationDependencies {
  settings: SystemSettingsRepository;
  fallback: MailSettingsFallback;
  sendTest?: (recipient: { email: string; name: string }) => Promise<void>;
  now?: () => Date;
  id?: () => string;
}

export function createMailSettingsAdministration({
  settings,
  fallback,
  sendTest,
  now = () => new Date(),
  id = () => `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
}: MailSettingsAdministrationDependencies) {
  async function requireReady(): Promise<MailSettings> {
    const current = await settings.getMailSettings(fallback);
    if (current.configurationState !== "ready") {
      throw new DomainError("MAIL_NOT_CONFIGURED", "Mail configuration is not ready.");
    }
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
    }): Promise<{ sent: true; recipient: string; occurredAt: Date }> {
      await requireReady();
      if (!sendTest) throw new Error("Mail test sender is not configured.");
      await sendTest(input.recipient);
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
  now = () => new Date(),
  id = () => `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
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

function validateMailSettings(input: UpdateMailSettingsInput): void {
  if (input.from?.action === "set" && !isEmail(input.from.value)) {
    throw new DomainError("BAD_REQUEST", "MAIL_FROM must be a valid email address.");
  }
  if (input.fromName?.action === "set" && !input.fromName.value.trim()) {
    throw new DomainError("BAD_REQUEST", "MAIL_FROM_NAME must not be empty.");
  }
  if (input.templatesBaseUrl?.action === "set" && !isUrl(input.templatesBaseUrl.value)) {
    throw new DomainError("BAD_REQUEST", "EMAIL_TEMPLATES_BASE_URL must be a valid URL.");
  }
  if (input.resendApiKey?.action === "replace" && !input.resendApiKey.value.trim()) {
    throw new DomainError("BAD_REQUEST", "RESEND_API_KEY must not be empty when replacing it.");
  }
}

function normalizeAuthSettings(input: UpdateAuthSettingsInput): UpdateAuthSettingsInput {
  if (input.allowedEmailDomains?.action !== "set") return input;
  if (input.allowedEmailDomains.value.length > 100) {
    throw new DomainError("BAD_REQUEST", "At most 100 allowed email domains may be configured.");
  }

  const allowedEmailDomains = [
    ...new Set(input.allowedEmailDomains.value.map((domain) => domain.trim().toLowerCase())),
  ].filter(Boolean);
  for (const domain of allowedEmailDomains) {
    if (!isDomain(domain)) {
      throw new DomainError("BAD_REQUEST", `${domain} is not a valid email domain.`);
    }
  }

  return { ...input, allowedEmailDomains: { action: "set", value: allowedEmailDomains } };
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

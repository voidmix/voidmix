import type {
  AuditEvent,
  AuthSettings,
  AuthSettingsView,
  MailRuntimeConfiguration,
  MailSettings,
  MailSettingsFallback,
  SystemSettingsRepository,
  UpdateSetting,
  UpdateAuthSettingsInput,
  UpdateMailSettingsInput,
  User,
  UserListQuery,
  UserPage,
  UserRepository,
  UserStatus,
} from "@voidmix/core";
import { createDefaultAuthSettings } from "@voidmix/core";

type StoredConfigurationValue = {
  value: string;
  updatedAt: Date;
  updatedBy: string | null;
};

const mailSettingKeys = [
  "mail.enabled",
  "mail.from",
  "mail.from_name",
  "mail.templates_base_url",
] as const;
const mailSecretKey = "mail.resend_api_key";
const authSettingKeys = [
  "auth.registration_mode",
  "auth.allowed_email_domains",
  "mail.welcome_enabled",
  "mail.verification_enabled",
  "mail.password_reset_enabled",
] as const;

export class InMemoryUserRepository implements UserRepository {
  readonly users = new Map<string, User>();
  readonly auditEvents: AuditEvent[] = [];

  constructor(seed: readonly User[] = []) {
    for (const user of seed) this.users.set(user.id, { ...user });
  }

  async list(query: UserListQuery): Promise<UserPage> {
    const normalizedQuery = query.query?.toLowerCase();
    const offset = query.cursor ? Number.parseInt(query.cursor, 10) || 0 : 0;
    const matches = [...this.users.values()]
      .filter(
        (user) =>
          !normalizedQuery ||
          user.email.toLowerCase().includes(normalizedQuery) ||
          user.displayName.toLowerCase().includes(normalizedQuery),
      )
      .sort(
        (left, right) =>
          right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id),
      );
    const items = matches.slice(offset, offset + query.limit);
    const nextOffset = offset + items.length;
    return {
      items: items.map((user) => ({ ...user })),
      total: matches.length,
      nextCursor: nextOffset < matches.length ? String(nextOffset) : null,
    };
  }

  async getById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async getByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase();
    const user = [...this.users.values()].find(
      (candidate) => candidate.email.toLowerCase() === normalized,
    );
    return user ? { ...user } : null;
  }

  async countActiveAdministrators(): Promise<number> {
    return [...this.users.values()].filter(
      (user) => user.status === "active" && (user.role === "admin" || user.role === "owner"),
    ).length;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, { ...user, email: user.email.toLowerCase() });
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) throw new Error(`Cannot update missing user ${id}`);
    const updated = { ...existing, status };
    this.users.set(id, updated);
    return { ...updated };
  }

  async appendAudit(event: AuditEvent): Promise<void> {
    this.auditEvents.push({ ...event, metadata: { ...event.metadata } });
  }

  async listAudit(limit: number): Promise<AuditEvent[]> {
    return [...this.auditEvents]
      .sort(
        (left, right) =>
          right.occurredAt.getTime() - left.occurredAt.getTime() || right.id.localeCompare(left.id),
      )
      .slice(0, limit)
      .map((event) => ({ ...event, metadata: { ...event.metadata } }));
  }
}

export class InMemorySystemSettingsRepository implements SystemSettingsRepository {
  readonly settings = new Map<string, StoredConfigurationValue>();
  readonly secrets = new Map<string, StoredConfigurationValue>();
  readonly auditEvents: AuditEvent[];

  constructor(
    options: {
      settings?: Readonly<Record<string, string>>;
      secrets?: Readonly<Record<string, string>>;
      auditEvents?: AuditEvent[];
      updatedAt?: Date;
    } = {},
  ) {
    const updatedAt = options.updatedAt ?? new Date("2026-01-01T00:00:00.000Z");
    for (const [key, value] of Object.entries(options.settings ?? {})) {
      this.settings.set(key, { value, updatedAt: new Date(updatedAt), updatedBy: null });
    }
    for (const [key, value] of Object.entries(options.secrets ?? {})) {
      this.secrets.set(key, { value, updatedAt: new Date(updatedAt), updatedBy: null });
    }
    this.auditEvents = options.auditEvents ?? [];
  }

  async getAuthSettings(): Promise<AuthSettingsView> {
    return resolveAuthSettings(this.settings);
  }

  async resolveAuthSettings(): Promise<AuthSettings> {
    const {
      sources: _sources,
      inherited: _inherited,
      ...settings
    } = resolveAuthSettings(this.settings);
    return settings;
  }

  async updateAuthSettings(input: {
    actorId: string;
    settings: UpdateAuthSettingsInput;
    audit: AuditEvent;
  }): Promise<AuthSettingsView> {
    const changedOperations = [
      applySettingMutation(
        this.settings,
        "auth.registration_mode",
        input.settings.registrationMode,
        String,
        input,
      ),
      applySettingMutation(
        this.settings,
        "auth.allowed_email_domains",
        input.settings.allowedEmailDomains,
        JSON.stringify,
        input,
      ),
      applySettingMutation(
        this.settings,
        "mail.welcome_enabled",
        input.settings.welcomeEmailEnabled,
        String,
        input,
      ),
      applySettingMutation(
        this.settings,
        "mail.verification_enabled",
        input.settings.verificationEmailEnabled,
        String,
        input,
      ),
      applySettingMutation(
        this.settings,
        "mail.password_reset_enabled",
        input.settings.passwordResetEmailEnabled,
        String,
        input,
      ),
    ].filter((operation): operation is string => operation !== null);

    const current = await this.getAuthSettings();
    if (changedOperations.length > 0) {
      this.auditEvents.push({
        ...input.audit,
        metadata: {
          fields: changedOperations.map(operationKey).join(","),
          operations: changedOperations.join(","),
          result: "updated",
        },
      });
    }
    return current;
  }

  async getMailSettings(fallback: MailSettingsFallback): Promise<MailSettings> {
    return resolveMailSettings(this.settings, this.secrets, fallback);
  }

  async resolveMailConfiguration(
    fallback: MailSettingsFallback,
  ): Promise<MailRuntimeConfiguration> {
    const view = resolveMailSettings(this.settings, this.secrets, fallback);
    return {
      settings: {
        enabled: view.enabled,
        from: view.from,
        fromName: view.fromName,
        templatesBaseUrl: view.templatesBaseUrl,
        configurationState: view.configurationState,
        missing: [...view.missing],
      },
      resendApiKey: this.secrets.get(mailSecretKey)?.value ?? fallback.resendApiKey.value,
    };
  }

  async updateMailSettings(input: {
    actorId: string;
    settings: UpdateMailSettingsInput;
    fallback: MailSettingsFallback;
    audit: AuditEvent;
  }): Promise<MailSettings> {
    const changedOperations = [
      applySettingMutation(this.settings, "mail.enabled", input.settings.enabled, String, input),
      applySettingMutation(
        this.settings,
        "mail.from",
        input.settings.from,
        (value) => value.trim(),
        input,
      ),
      applySettingMutation(
        this.settings,
        "mail.from_name",
        input.settings.fromName,
        (value) => value.trim(),
        input,
      ),
      applySettingMutation(
        this.settings,
        "mail.templates_base_url",
        input.settings.templatesBaseUrl,
        (value) => value.trim(),
        input,
      ),
    ].filter((operation): operation is string => operation !== null);

    const secretMutation = input.settings.resendApiKey;
    if (secretMutation?.action === "reset") {
      if (this.secrets.delete(mailSecretKey)) changedOperations.push(`${mailSecretKey}:reset`);
    } else if (secretMutation?.action === "replace") {
      const replacement = secretMutation.value.trim();
      if (this.secrets.get(mailSecretKey)?.value !== replacement) {
        this.secrets.set(mailSecretKey, {
          value: replacement,
          updatedAt: new Date(input.audit.occurredAt),
          updatedBy: input.actorId,
        });
        changedOperations.push(`${mailSecretKey}:replace`);
      }
    }

    const current = await this.getMailSettings(input.fallback);
    if (changedOperations.length > 0) {
      this.auditEvents.push({
        ...input.audit,
        metadata: {
          fields: changedOperations.map(operationKey).join(","),
          operations: changedOperations.join(","),
          result: "updated",
        },
      });
    }
    return current;
  }

  async appendMailTestAudit(event: AuditEvent): Promise<void> {
    this.auditEvents.push({ ...event, metadata: { ...event.metadata } });
  }
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "true";
}

function resolveNullable(value: string | undefined, fallback: string | null): string | null {
  return value === undefined ? fallback : value || null;
}

function parseStringArray(value: string | undefined, fallback: string[]): string[] {
  if (value === undefined) return [...fallback];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? [...new Set(parsed.map((item) => item.trim().toLowerCase()).filter(Boolean))]
      : [...fallback];
  } catch {
    return [...fallback];
  }
}

function latestDate(values: Array<Date | undefined>): Date | null {
  const timestamps = values.filter((value): value is Date => value !== undefined);
  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps.map((value) => value.getTime())));
}

function resolveAuthSettings(settings: Map<string, StoredConfigurationValue>): AuthSettingsView {
  const defaults = createDefaultAuthSettings();
  const registrationModeRow = settings.get("auth.registration_mode");
  const allowedEmailDomainsRow = settings.get("auth.allowed_email_domains");
  const welcomeEmailEnabledRow = settings.get("mail.welcome_enabled");
  const verificationEmailEnabledRow = settings.get("mail.verification_enabled");
  const passwordResetEmailEnabledRow = settings.get("mail.password_reset_enabled");
  return {
    registrationMode: registrationModeRow?.value === "closed" ? "closed" : "open",
    allowedEmailDomains: parseStringArray(
      allowedEmailDomainsRow?.value,
      defaults.allowedEmailDomains,
    ),
    welcomeEmailEnabled: parseBoolean(welcomeEmailEnabledRow?.value, defaults.welcomeEmailEnabled),
    verificationEmailEnabled: parseBoolean(
      verificationEmailEnabledRow?.value,
      defaults.verificationEmailEnabled,
    ),
    passwordResetEmailEnabled: parseBoolean(
      passwordResetEmailEnabledRow?.value,
      defaults.passwordResetEmailEnabled,
    ),
    sources: {
      registrationMode: registrationModeRow ? "database" : "default",
      allowedEmailDomains: allowedEmailDomainsRow ? "database" : "default",
      welcomeEmailEnabled: welcomeEmailEnabledRow ? "database" : "default",
      verificationEmailEnabled: verificationEmailEnabledRow ? "database" : "default",
      passwordResetEmailEnabled: passwordResetEmailEnabledRow ? "database" : "default",
    },
    inherited: {
      registrationMode: { value: defaults.registrationMode, source: "default" },
      allowedEmailDomains: { value: [...defaults.allowedEmailDomains], source: "default" },
      welcomeEmailEnabled: { value: defaults.welcomeEmailEnabled, source: "default" },
      verificationEmailEnabled: {
        value: defaults.verificationEmailEnabled,
        source: "default",
      },
      passwordResetEmailEnabled: {
        value: defaults.passwordResetEmailEnabled,
        source: "default",
      },
    },
    updatedAt: latestDate(authSettingKeys.map((key) => settings.get(key)?.updatedAt)),
  };
}

function resolveMailSettings(
  settings: Map<string, StoredConfigurationValue>,
  secrets: Map<string, StoredConfigurationValue>,
  fallback: MailSettingsFallback,
): MailSettings {
  const enabledRow = settings.get("mail.enabled");
  const fromRow = settings.get("mail.from");
  const fromNameRow = settings.get("mail.from_name");
  const templatesBaseUrlRow = settings.get("mail.templates_base_url");
  const secretRow = secrets.get(mailSecretKey);
  const enabled = parseBoolean(enabledRow?.value, fallback.enabled.value);
  const from = resolveNullable(fromRow?.value, fallback.from.value);
  const fromName = fromNameRow?.value ?? fallback.fromName.value;
  const templatesBaseUrl = resolveNullable(
    templatesBaseUrlRow?.value,
    fallback.templatesBaseUrl.value,
  );
  const resendApiKey = secretRow?.value ?? fallback.resendApiKey.value;
  const missing: MailSettings["missing"] = [];
  if (enabled && !resendApiKey) missing.push("RESEND_API_KEY");
  if (enabled && !from) missing.push("MAIL_FROM");
  return {
    enabled,
    from,
    fromName,
    templatesBaseUrl,
    sources: {
      enabled: enabledRow ? "database" : fallback.enabled.source,
      from: fromRow ? "database" : fallback.from.source,
      fromName: fromNameRow ? "database" : fallback.fromName.source,
      templatesBaseUrl: templatesBaseUrlRow ? "database" : fallback.templatesBaseUrl.source,
    },
    inherited: {
      enabled: { ...fallback.enabled },
      from: { ...fallback.from },
      fromName: { ...fallback.fromName },
      templatesBaseUrl: { ...fallback.templatesBaseUrl },
    },
    resendApiKey: {
      configured: Boolean(resendApiKey),
      source: secretRow ? "database" : fallback.resendApiKey.value ? "environment" : "missing",
      inheritedConfigured: Boolean(fallback.resendApiKey.value),
    },
    configurationState: !enabled ? "disabled" : missing.length === 0 ? "ready" : "incomplete",
    missing,
    updatedAt: latestDate([
      ...mailSettingKeys.map((key) => settings.get(key)?.updatedAt),
      secretRow?.updatedAt,
    ]),
  };
}

function applySettingMutation<T>(
  settings: Map<string, StoredConfigurationValue>,
  key: string,
  mutation: UpdateSetting<T> | undefined,
  serialize: (value: T) => string,
  input: { actorId: string; audit: AuditEvent },
): string | null {
  if (!mutation) return null;
  if (mutation.action === "reset") {
    return settings.delete(key) ? `${key}:reset` : null;
  }
  const value = serialize(mutation.value);
  if (settings.get(key)?.value === value) return null;
  settings.set(key, {
    value,
    updatedAt: new Date(input.audit.occurredAt),
    updatedBy: input.actorId,
  });
  return `${key}:set`;
}

function operationKey(operation: string): string {
  return operation.slice(0, operation.lastIndexOf(":"));
}

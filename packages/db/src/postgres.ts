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
} from "@voidmix/domain";
import { createDefaultAuthSettings } from "@voidmix/domain";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres, { type Sql } from "postgres";

import { auditEvents, relations, systemSecrets, systemSettings, users } from "./schema.js";

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

export interface DatabaseConnection {
  db: PostgresJsDatabase;
  close(): Promise<void>;
}

export function connectDatabase(databaseUrl: string): DatabaseConnection {
  const client = postgres(databaseUrl, { max: 10 });
  return {
    db: drizzle({ client, relations }),
    close: () => client.end(),
  };
}

export async function migrateDatabase(
  databaseUrl: string,
  migrationsFolder = new URL("../drizzle", import.meta.url).pathname,
): Promise<void> {
  const client: Sql = postgres(databaseUrl, { max: 1 });
  try {
    await migrate(drizzle({ client, relations }), { migrationsFolder });
  } finally {
    await client.end();
  }
}

// Drops every table and the drizzle migration bookkeeping, leaving an empty
// `public` schema for `db push` or a fresh `db migrate`. Callers own the
// development/test restriction.
export async function resetDatabase(databaseUrl: string): Promise<void> {
  const client: Sql = postgres(databaseUrl, { max: 1 });
  try {
    await client`drop schema if exists drizzle cascade`;
    await client`drop schema if exists public cascade`;
    await client`create schema public`;
  } finally {
    await client.end();
  }
}

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async list(query: UserListQuery): Promise<UserPage> {
    const offset = parseCursor(query.cursor);
    const search = query.query
      ? or(ilike(users.email, `%${query.query}%`), ilike(users.displayName, `%${query.query}%`))
      : undefined;
    const where = search ? and(search) : undefined;
    const [rows, totals] = await Promise.all([
      this.db
        .select()
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt), desc(users.id))
        .limit(query.limit)
        .offset(offset),
      this.db
        .select({ value: sql<number>`count(*)::int` })
        .from(users)
        .where(where),
    ]);
    const total = totals[0]?.value ?? 0;
    const nextOffset = offset + rows.length;
    return {
      items: rows,
      total,
      nextCursor: nextOffset < total ? String(nextOffset) : null,
    };
  }

  async getById(id: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  }

  async getByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return user ?? null;
  }

  async countActiveAdministrators(): Promise<number> {
    const [result] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.status, "active"), inArray(users.role, ["admin", "owner"])));
    return result?.value ?? 0;
  }

  async save(user: User): Promise<void> {
    await this.db.insert(users).values({ ...user, email: user.email.toLowerCase() });
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const [updated] = await this.db
      .update(users)
      .set({ status })
      .where(eq(users.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Cannot update missing user ${id}`);
    }
    return updated;
  }

  async appendAudit(event: AuditEvent): Promise<void> {
    await this.db.insert(auditEvents).values(toAuditInsert(event));
  }

  async listAudit(limit: number): Promise<AuditEvent[]> {
    return this.db
      .select()
      .from(auditEvents)
      .orderBy(desc(auditEvents.occurredAt), desc(auditEvents.id))
      .limit(limit);
  }
}

export class PostgresSystemSettingsRepository implements SystemSettingsRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async getAuthSettings(): Promise<AuthSettingsView> {
    const settingRows = await this.db
      .select()
      .from(systemSettings)
      .where(inArray(systemSettings.key, [...authSettingKeys]));
    return resolveAuthSettings(settingRows);
  }

  async resolveAuthSettings(): Promise<AuthSettings> {
    const { sources: _sources, inherited: _inherited, ...settings } = await this.getAuthSettings();
    return settings;
  }

  async updateAuthSettings(input: {
    actorId: string;
    settings: UpdateAuthSettingsInput;
    audit: AuditEvent;
  }): Promise<AuthSettingsView> {
    return this.db.transaction(async (tx) => {
      const settingRows = await tx
        .select()
        .from(systemSettings)
        .where(inArray(systemSettings.key, [...authSettingKeys]));
      const existingSettings = new Map(settingRows.map((row) => [row.key, row]));
      const apply = async <T>(
        key: string,
        mutation: UpdateSetting<T> | undefined,
        serialize: (value: T) => string,
      ): Promise<string | null> => {
        if (!mutation) return null;
        if (mutation.action === "reset") {
          if (!existingSettings.has(key)) return null;
          await tx.delete(systemSettings).where(eq(systemSettings.key, key));
          existingSettings.delete(key);
          return `${key}:reset`;
        }
        const value = serialize(mutation.value);
        if (existingSettings.get(key)?.value === value) return null;
        await tx
          .insert(systemSettings)
          .values({ key, value, updatedAt: input.audit.occurredAt, updatedBy: input.actorId })
          .onConflictDoUpdate({
            target: systemSettings.key,
            set: { value, updatedAt: input.audit.occurredAt, updatedBy: input.actorId },
          });
        existingSettings.set(key, {
          key,
          value,
          updatedAt: input.audit.occurredAt,
          updatedBy: input.actorId,
        });
        return `${key}:set`;
      };
      const changedOperations = (
        await Promise.all([
          apply("auth.registration_mode", input.settings.registrationMode, String),
          apply("auth.allowed_email_domains", input.settings.allowedEmailDomains, JSON.stringify),
          apply("mail.welcome_enabled", input.settings.welcomeEmailEnabled, String),
          apply("mail.verification_enabled", input.settings.verificationEmailEnabled, String),
          apply("mail.password_reset_enabled", input.settings.passwordResetEmailEnabled, String),
        ])
      ).filter((operation): operation is string => operation !== null);

      const current = resolveAuthSettings([...existingSettings.values()]);
      if (changedOperations.length > 0) {
        await tx.insert(auditEvents).values(
          toAuditInsert({
            ...input.audit,
            metadata: {
              fields: changedOperations.map(operationKey).join(","),
              operations: changedOperations.join(","),
              result: "updated",
            },
          }),
        );
      }
      return current;
    });
  }

  async getMailSettings(fallback: MailSettingsFallback): Promise<MailSettings> {
    const settingRows = await this.db
      .select()
      .from(systemSettings)
      .where(inArray(systemSettings.key, [...mailSettingKeys]));
    const [secretRow] = await this.db
      .select()
      .from(systemSecrets)
      .where(eq(systemSecrets.key, mailSecretKey))
      .limit(1);
    return resolveMailSettings(settingRows, secretRow ?? null, fallback);
  }

  async resolveMailConfiguration(
    fallback: MailSettingsFallback,
  ): Promise<MailRuntimeConfiguration> {
    const settingRows = await this.db
      .select()
      .from(systemSettings)
      .where(inArray(systemSettings.key, [...mailSettingKeys]));
    const [secretRow] = await this.db
      .select()
      .from(systemSecrets)
      .where(eq(systemSecrets.key, mailSecretKey))
      .limit(1);
    const view = resolveMailSettings(settingRows, secretRow ?? null, fallback);
    return {
      settings: {
        enabled: view.enabled,
        from: view.from,
        fromName: view.fromName,
        templatesBaseUrl: view.templatesBaseUrl,
        configurationState: view.configurationState,
        missing: [...view.missing],
      },
      resendApiKey: secretRow?.value ?? fallback.resendApiKey.value,
    };
  }

  async updateMailSettings(input: {
    actorId: string;
    settings: UpdateMailSettingsInput;
    fallback: MailSettingsFallback;
    audit: AuditEvent;
  }): Promise<MailSettings> {
    return this.db.transaction(async (tx) => {
      const settingRows = await tx
        .select()
        .from(systemSettings)
        .where(inArray(systemSettings.key, [...mailSettingKeys]));
      const [secretRow] = await tx
        .select()
        .from(systemSecrets)
        .where(eq(systemSecrets.key, mailSecretKey))
        .limit(1);
      const existingSettings = new Map(settingRows.map((row) => [row.key, row]));
      const apply = async <T>(
        key: string,
        mutation: UpdateSetting<T> | undefined,
        serialize: (value: T) => string,
      ): Promise<string | null> => {
        if (!mutation) return null;
        if (mutation.action === "reset") {
          if (!existingSettings.has(key)) return null;
          await tx.delete(systemSettings).where(eq(systemSettings.key, key));
          existingSettings.delete(key);
          return `${key}:reset`;
        }
        const value = serialize(mutation.value);
        if (existingSettings.get(key)?.value === value) return null;
        await tx
          .insert(systemSettings)
          .values({ key, value, updatedAt: input.audit.occurredAt, updatedBy: input.actorId })
          .onConflictDoUpdate({
            target: systemSettings.key,
            set: { value, updatedAt: input.audit.occurredAt, updatedBy: input.actorId },
          });
        existingSettings.set(key, {
          key,
          value,
          updatedAt: input.audit.occurredAt,
          updatedBy: input.actorId,
        });
        return `${key}:set`;
      };
      const changedOperations = (
        await Promise.all([
          apply("mail.enabled", input.settings.enabled, String),
          apply("mail.from", input.settings.from, (value) => value.trim()),
          apply("mail.from_name", input.settings.fromName, (value) => value.trim()),
          apply("mail.templates_base_url", input.settings.templatesBaseUrl, (value) =>
            value.trim(),
          ),
        ])
      ).filter((operation): operation is string => operation !== null);

      let nextSecret = secretRow ?? null;
      const secretMutation = input.settings.resendApiKey;
      if (secretMutation?.action === "reset") {
        if (secretRow) {
          await tx.delete(systemSecrets).where(eq(systemSecrets.key, mailSecretKey));
          changedOperations.push(`${mailSecretKey}:reset`);
          nextSecret = null;
        }
      } else if (secretMutation?.action === "replace") {
        const replacement = secretMutation.value.trim();
        if (secretRow?.value === replacement) {
          nextSecret = secretRow ?? null;
        } else {
          await tx
            .insert(systemSecrets)
            .values({
              key: mailSecretKey,
              value: replacement,
              updatedAt: input.audit.occurredAt,
              updatedBy: input.actorId,
            })
            .onConflictDoUpdate({
              target: systemSecrets.key,
              set: {
                value: replacement,
                updatedAt: input.audit.occurredAt,
                updatedBy: input.actorId,
              },
            });
          nextSecret = {
            key: mailSecretKey,
            value: replacement,
            updatedAt: input.audit.occurredAt,
            updatedBy: input.actorId,
          };
          changedOperations.push(`${mailSecretKey}:replace`);
        }
      }

      const current = resolveMailSettings(
        [...existingSettings.values()],
        nextSecret,
        input.fallback,
      );
      if (changedOperations.length > 0) {
        await tx.insert(auditEvents).values(
          toAuditInsert({
            ...input.audit,
            metadata: {
              fields: changedOperations.map(operationKey).join(","),
              operations: changedOperations.join(","),
              result: "updated",
            },
          }),
        );
      }
      return current;
    });
  }

  async appendMailTestAudit(event: AuditEvent): Promise<void> {
    await this.db.insert(auditEvents).values(toAuditInsert(event));
  }
}

function parseCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  const offset = Number.parseInt(cursor, 10);
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
}

function resolveMailSettings(
  settingRows: Array<typeof systemSettings.$inferSelect>,
  secretRow: typeof systemSecrets.$inferSelect | null,
  fallback: MailSettingsFallback,
): MailSettings {
  const values = new Map(settingRows.map((row) => [row.key, row.value]));
  const enabled = parseBoolean(values.get("mail.enabled"), fallback.enabled.value);
  const from = resolveNullable(values.get("mail.from"), fallback.from.value);
  const fromName = values.get("mail.from_name") ?? fallback.fromName.value;
  const templatesBaseUrl = resolveNullable(
    values.get("mail.templates_base_url"),
    fallback.templatesBaseUrl.value,
  );
  const resendApiKey = secretRow?.value ?? fallback.resendApiKey.value;
  const updatedAt = latestDate([...settingRows.map((row) => row.updatedAt), secretRow?.updatedAt]);
  const missing: MailSettings["missing"] = [];
  if (enabled && !resendApiKey) missing.push("RESEND_API_KEY");
  if (enabled && !from) missing.push("MAIL_FROM");
  return {
    enabled,
    from,
    fromName,
    templatesBaseUrl,
    sources: {
      enabled: values.has("mail.enabled") ? "database" : fallback.enabled.source,
      from: values.has("mail.from") ? "database" : fallback.from.source,
      fromName: values.has("mail.from_name") ? "database" : fallback.fromName.source,
      templatesBaseUrl: values.has("mail.templates_base_url")
        ? "database"
        : fallback.templatesBaseUrl.source,
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
    updatedAt,
  };
}

function resolveAuthSettings(
  settingRows: Array<typeof systemSettings.$inferSelect>,
): AuthSettingsView {
  const defaults = createDefaultAuthSettings();
  const values = new Map(settingRows.map((row) => [row.key, row.value]));
  return {
    registrationMode: values.get("auth.registration_mode") === "closed" ? "closed" : "open",
    allowedEmailDomains: parseStringArray(
      values.get("auth.allowed_email_domains"),
      defaults.allowedEmailDomains,
    ),
    welcomeEmailEnabled: parseBoolean(
      values.get("mail.welcome_enabled"),
      defaults.welcomeEmailEnabled,
    ),
    verificationEmailEnabled: parseBoolean(
      values.get("mail.verification_enabled"),
      defaults.verificationEmailEnabled,
    ),
    passwordResetEmailEnabled: parseBoolean(
      values.get("mail.password_reset_enabled"),
      defaults.passwordResetEmailEnabled,
    ),
    sources: {
      registrationMode: values.has("auth.registration_mode") ? "database" : "default",
      allowedEmailDomains: values.has("auth.allowed_email_domains") ? "database" : "default",
      welcomeEmailEnabled: values.has("mail.welcome_enabled") ? "database" : "default",
      verificationEmailEnabled: values.has("mail.verification_enabled") ? "database" : "default",
      passwordResetEmailEnabled: values.has("mail.password_reset_enabled") ? "database" : "default",
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
    updatedAt: latestDate(settingRows.map((row) => row.updatedAt)),
  };
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

function operationKey(operation: string): string {
  return operation.slice(0, operation.lastIndexOf(":"));
}

function toAuditInsert(event: AuditEvent): typeof auditEvents.$inferInsert {
  return {
    id: event.id,
    actorId: event.actorId,
    action: event.action,
    targetType: event.targetType,
    targetId: event.targetId,
    occurredAt: event.occurredAt,
    metadata: event.metadata,
  };
}

import type { AuditEvent, MailSettingsFallback } from "@voidmix/core";
import { describe, expect, it } from "vite-plus/test";

import { PostgresSystemSettingsRepository } from "./postgres.js";
import { auditEvents, systemSecrets, systemSettings } from "./schema.js";

interface StoredRow {
  key: string;
  value: string;
  updatedAt: Date;
  updatedBy: string | null;
}

class FakePostgresDatabase {
  readonly settings = new Map<string, StoredRow>();
  readonly secrets = new Map<string, StoredRow>();
  readonly audits: Array<Record<string, unknown>> = [];

  constructor(
    options: {
      settings?: Record<string, string>;
      secrets?: Record<string, string>;
      settingDeletes?: string[];
      secretDeletes?: string[];
    } = {},
  ) {
    const updatedAt = new Date("2026-08-24T00:00:00.000Z");
    for (const [key, value] of Object.entries(options.settings ?? {})) {
      this.settings.set(key, { key, value, updatedAt, updatedBy: null });
    }
    for (const [key, value] of Object.entries(options.secrets ?? {})) {
      this.secrets.set(key, { key, value, updatedAt, updatedBy: null });
    }
    this.settingDeletes = [...(options.settingDeletes ?? [])];
    this.secretDeletes = [...(options.secretDeletes ?? [])];
  }

  private readonly settingDeletes: string[];
  private readonly secretDeletes: string[];

  async transaction<Result>(run: (tx: FakePostgresDatabase) => Promise<Result>): Promise<Result> {
    return run(this);
  }

  select() {
    return {
      from: (table: unknown) => {
        const rows =
          table === systemSettings
            ? [...this.settings.values()]
            : table === systemSecrets
              ? [...this.secrets.values()]
              : [];
        if (table === systemSecrets) {
          return {
            where: (_condition: unknown) => ({
              limit: async (limit: number) => rows.slice(0, limit),
            }),
          };
        }
        return { where: async (_condition: unknown) => rows };
      },
    };
  }

  delete(table: unknown) {
    return {
      where: async (_condition: unknown) => {
        if (table === systemSettings) {
          const key = this.settingDeletes.shift();
          if (key) this.settings.delete(key);
        }
        if (table === systemSecrets) {
          const key = this.secretDeletes.shift();
          if (key) this.secrets.delete(key);
        }
      },
    };
  }

  insert(table: unknown) {
    return {
      values: (value: unknown) => {
        const row = value as Record<string, unknown>;
        if (table === auditEvents) {
          this.audits.push({ ...row });
          return Promise.resolve();
        }
        const upsert = async () => {
          const stored: StoredRow = {
            key: String(row.key),
            value: String(row.value),
            updatedAt: row.updatedAt as Date,
            updatedBy: typeof row.updatedBy === "string" ? row.updatedBy : null,
          };
          if (table === systemSettings) this.settings.set(stored.key, stored);
          if (table === systemSecrets) this.secrets.set(stored.key, stored);
        };
        return { onConflictDoUpdate: upsert };
      },
    };
  }
}

const fallback: MailSettingsFallback = {
  enabled: { value: true, source: "default" },
  from: { value: "environment@example.com", source: "environment" },
  fromName: { value: "Voidmix", source: "default" },
  templatesBaseUrl: { value: null, source: "missing" },
  resendApiKey: { value: "environment-key", source: "environment" },
};

function repository(database: FakePostgresDatabase): PostgresSystemSettingsRepository {
  return new PostgresSystemSettingsRepository(
    database as unknown as ConstructorParameters<typeof PostgresSystemSettingsRepository>[0],
  );
}

function audit(id: string, targetId: "auth" | "mail"): AuditEvent {
  return {
    id,
    actorId: "owner-1",
    action: "system.settings.updated",
    targetType: "system_setting",
    targetId,
    targetUserId: null,
    occurredAt: new Date("2026-08-24T02:00:00.000Z"),
    metadata: {},
  };
}

describe("PostgresSystemSettingsRepository", () => {
  it("deletes an Auth override, upserts only submitted fields, and audits operations", async () => {
    const database = new FakePostgresDatabase({
      settings: { "auth.registration_mode": "closed" },
      settingDeletes: ["auth.registration_mode"],
    });

    const updated = await repository(database).updateAuthSettings({
      actorId: "owner-1",
      settings: {
        registrationMode: { action: "reset" },
        allowedEmailDomains: { action: "set", value: ["example.com"] },
      },
      audit: audit("audit-auth", "auth"),
    });

    expect(database.settings.has("auth.registration_mode")).toBe(false);
    expect(database.settings.get("auth.allowed_email_domains")?.value).toBe('["example.com"]');
    expect(updated).toMatchObject({
      registrationMode: "open",
      sources: { registrationMode: "default", allowedEmailDomains: "database" },
    });
    expect(database.audits[0]?.metadata).toEqual({
      fields: "auth.registration_mode,auth.allowed_email_domains",
      operations: "auth.registration_mode:reset,auth.allowed_email_domains:set",
      result: "updated",
    });
    expect(JSON.stringify(database.audits)).not.toContain("example.com");
  });

  it("resets mail and secret rows to environment fallbacks in one transaction result", async () => {
    const database = new FakePostgresDatabase({
      settings: { "mail.from": "database@example.com" },
      secrets: { "mail.resend_api_key": "database-key" },
      settingDeletes: ["mail.from"],
      secretDeletes: ["mail.resend_api_key"],
    });

    const updated = await repository(database).updateMailSettings({
      actorId: "owner-1",
      settings: {
        from: { action: "reset" },
        fromName: { action: "set", value: "Database sender" },
        resendApiKey: { action: "reset" },
      },
      fallback,
      audit: audit("audit-mail", "mail"),
    });

    expect([...database.settings.keys()]).toEqual(["mail.from_name"]);
    expect(database.secrets.size).toBe(0);
    expect(updated).toMatchObject({
      from: "environment@example.com",
      fromName: "Database sender",
      sources: { from: "environment", fromName: "database" },
      resendApiKey: { configured: true, source: "environment" },
    });
    expect(JSON.stringify(database.audits)).not.toContain("database-key");
    expect(JSON.stringify(database.audits)).not.toContain("environment-key");
  });

  it("does not write or audit absent reset operations", async () => {
    const database = new FakePostgresDatabase();

    await repository(database).updateAuthSettings({
      actorId: "owner-1",
      settings: { registrationMode: { action: "reset" } },
      audit: audit("audit-noop", "auth"),
    });

    expect(database.settings.size).toBe(0);
    expect(database.audits).toHaveLength(0);
  });
});

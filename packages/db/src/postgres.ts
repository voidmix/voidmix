import type {
  AgentLease,
  AgentCommandRepository,
  AgentLeaseRepository,
  AgentRun,
  AgentRunStatus,
  AgentRunRepository,
  AgentStep,
  AgentStepStatus,
  AgentStepRepository,
  Asset,
  AssetRepository,
  AssetVersion,
  AssetVersionCommitOutcome,
  AssetVersionRepository,
  SyncConflict,
  SyncConflictRepository,
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
  WorkspaceMembership,
  WorkspaceMembershipRepository,
} from "@voidmix/core";
import { createDefaultAuthSettings, isTerminalRunStatus } from "@voidmix/core";
import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres, { type Sql } from "postgres";

import {
  agentLeases,
  agentRuns,
  agentSteps,
  assetVersions,
  assets,
  auditEvents,
  relations,
  syncConflicts,
  systemSecrets,
  systemSettings,
  users,
  workspaceMemberships,
} from "./schema.js";

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

export class PostgresWorkspaceMembershipRepository implements WorkspaceMembershipRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async getByUserAndWorkspace(input: {
    userId: string;
    workspaceId: string;
  }): Promise<WorkspaceMembership | null> {
    const [row] = await this.db
      .select()
      .from(workspaceMemberships)
      .where(
        and(
          eq(workspaceMemberships.userId, input.userId),
          eq(workspaceMemberships.workspaceId, input.workspaceId),
        ),
      )
      .limit(1);
    return row ?? null;
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

export class PostgresAssetRepository implements AssetRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async getById(id: string): Promise<Asset | null> {
    const [row] = await this.db.select().from(assets).where(eq(assets.id, id)).limit(1);
    return row ?? null;
  }

  async getByPath(input: { workspaceId: string; path: string }): Promise<Asset | null> {
    const [row] = await this.db
      .select()
      .from(assets)
      .where(and(eq(assets.workspaceId, input.workspaceId), eq(assets.path, input.path)))
      .limit(1);
    return row ?? null;
  }

  async createIfPathAvailable(asset: Asset) {
    const [row] = await this.db
      .insert(assets)
      .values(asset)
      .onConflictDoNothing({ target: [assets.workspaceId, assets.path] })
      .returning();
    return row ? { status: "created" as const, asset: row } : { status: "path_conflict" as const };
  }
}

export class PostgresAssetVersionRepository implements AssetVersionRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async getById(id: string): Promise<AssetVersion | null> {
    const [row] = await this.db
      .select()
      .from(assetVersions)
      .where(eq(assetVersions.id, id))
      .limit(1);
    return row ?? null;
  }

  async getByIdempotencyKey(input: {
    assetId: string;
    idempotencyKey: string;
  }): Promise<AssetVersion | null> {
    const [row] = await this.db
      .select()
      .from(assetVersions)
      .where(
        and(
          eq(assetVersions.assetId, input.assetId),
          eq(assetVersions.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);
    return row ?? null;
  }
}

/**
 * Build the complete asset adapter graph. Version insertion and head movement
 * happen in one transaction with a compare-and-set on the observed head.
 */
export function createPostgresAssetRepositories(db: PostgresJsDatabase): {
  assets: PostgresAssetRepository;
  versions: PostgresAssetVersionRepository;
  conflicts: PostgresSyncConflictRepository;
  commitVersion(input: {
    version: AssetVersion;
    expectedHeadVersionId: string | null;
  }): Promise<AssetVersionCommitOutcome>;
} {
  const assetsRepository = new PostgresAssetRepository(db);
  const versionsRepository = new PostgresAssetVersionRepository(db);
  const conflictsRepository = new PostgresSyncConflictRepository(db);
  return {
    assets: assetsRepository,
    versions: versionsRepository,
    conflicts: conflictsRepository,
    async commitVersion({ version, expectedHeadVersionId }) {
      return db.transaction(async (tx) => {
        const existingRows = await tx
          .select()
          .from(assetVersions)
          .where(
            and(
              eq(assetVersions.assetId, version.assetId),
              eq(assetVersions.idempotencyKey, version.idempotencyKey),
            ),
          )
          .limit(1);
        const existing = existingRows[0];
        if (existing) {
          const [currentAsset] = await tx
            .select()
            .from(assets)
            .where(eq(assets.id, version.assetId))
            .limit(1);
          return currentAsset
            ? { status: "committed", version: existing, asset: currentAsset }
            : { status: "not_found" };
        }

        const headCondition =
          expectedHeadVersionId === null
            ? isNull(assets.headVersionId)
            : eq(assets.headVersionId, expectedHeadVersionId);
        const [updatedAsset] = await tx
          .update(assets)
          .set({ headVersionId: version.id, updatedAt: version.createdAt })
          .where(
            and(
              eq(assets.id, version.assetId),
              eq(assets.workspaceId, version.workspaceId),
              eq(assets.status, "active"),
              headCondition,
            ),
          )
          .returning();
        if (!updatedAsset) {
          // Another transaction may have committed the same idempotency key
          // while this transaction waited on the compare-and-set row lock.
          // Treat that replay as success; the domain layer validates that its
          // payload matches the original command.
          const [replayedVersion] = await tx
            .select()
            .from(assetVersions)
            .where(
              and(
                eq(assetVersions.assetId, version.assetId),
                eq(assetVersions.idempotencyKey, version.idempotencyKey),
              ),
            )
            .limit(1);
          if (replayedVersion) {
            const [currentAsset] = await tx
              .select()
              .from(assets)
              .where(eq(assets.id, version.assetId))
              .limit(1);
            return currentAsset
              ? { status: "committed", version: replayedVersion, asset: currentAsset }
              : { status: "not_found" };
          }
          const [currentAsset] = await tx
            .select()
            .from(assets)
            .where(eq(assets.id, version.assetId))
            .limit(1);
          return currentAsset
            ? { status: "head_conflict", actualHeadVersionId: currentAsset.headVersionId }
            : { status: "not_found" };
        }
        await tx.insert(assetVersions).values(version);
        return { status: "committed", version, asset: updatedAsset };
      });
    },
  };
}

export class PostgresSyncConflictRepository implements SyncConflictRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async getById(id: string): Promise<SyncConflict | null> {
    const [row] = await this.db
      .select()
      .from(syncConflicts)
      .where(eq(syncConflicts.id, id))
      .limit(1);
    return row ?? null;
  }

  async save(conflict: SyncConflict): Promise<void> {
    await this.db.insert(syncConflicts).values(conflict);
  }

  async resolve(conflict: SyncConflict) {
    const [resolved] = await this.db
      .update(syncConflicts)
      .set({
        status: "resolved",
        resolvedAt: conflict.resolvedAt,
        resolvedBy: conflict.resolvedBy,
      })
      .where(and(eq(syncConflicts.id, conflict.id), eq(syncConflicts.status, "open")))
      .returning();
    if (resolved) return { status: "resolved" as const, conflict: resolved };
    const [current] = await this.db
      .select()
      .from(syncConflicts)
      .where(eq(syncConflicts.id, conflict.id))
      .limit(1);
    return current
      ? { status: "already_resolved" as const, conflict: current }
      : { status: "not_found" as const };
  }
}

export class PostgresAgentRunRepository implements AgentRunRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async getById(id: string): Promise<AgentRun | null> {
    const [row] = await this.db.select().from(agentRuns).where(eq(agentRuns.id, id)).limit(1);
    return row ?? null;
  }

  async save(run: AgentRun): Promise<void> {
    await this.db.insert(agentRuns).values(run);
  }
}

export class PostgresAgentStepRepository implements AgentStepRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async getById(id: string): Promise<AgentStep | null> {
    const [row] = await this.db.select().from(agentSteps).where(eq(agentSteps.id, id)).limit(1);
    return row ?? null;
  }
}

export class PostgresAgentLeaseRepository implements AgentLeaseRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async getByRunId(runId: string): Promise<AgentLease | null> {
    const [row] = await this.db
      .select()
      .from(agentLeases)
      .where(eq(agentLeases.runId, runId))
      .limit(1);
    return row ?? null;
  }
}

/**
 * Transactional Agent commands. Run rows are the serialization point for
 * leases and step allocation; conditional status predicates protect all
 * transitions from stale workers.
 */
export class PostgresAgentCommandRepository implements AgentCommandRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async acquireLease(input: {
    runId: string;
    holderId: string;
    now: Date;
    leaseDurationMs: number;
  }) {
    return this.db.transaction(async (tx) => {
      const [run] = await tx
        .select()
        .from(agentRuns)
        .where(eq(agentRuns.id, input.runId))
        .for("update")
        .limit(1);
      if (!run) return { status: "run_not_found" as const };
      if (isTerminalRunStatus(run.status)) return { status: "terminal" as const };

      const [existing] = await tx
        .select()
        .from(agentLeases)
        .where(eq(agentLeases.runId, input.runId))
        .for("update")
        .limit(1);
      const existingIsActive =
        existing !== undefined && existing.expiresAt.getTime() > input.now.getTime();
      if (existingIsActive) {
        if (existing.holderId !== input.holderId) {
          return { status: "held" as const, lease: existing };
        }
      }

      const lease: AgentLease = {
        runId: input.runId,
        holderId: input.holderId,
        acquiredAt: existingIsActive ? existing.acquiredAt : input.now,
        heartbeatAt: input.now,
        expiresAt: new Date(input.now.getTime() + input.leaseDurationMs),
      };
      const [savedLease] = await tx
        .insert(agentLeases)
        .values(lease)
        .onConflictDoUpdate({
          target: agentLeases.runId,
          set: {
            holderId: lease.holderId,
            acquiredAt: lease.acquiredAt,
            heartbeatAt: lease.heartbeatAt,
            expiresAt: lease.expiresAt,
          },
        })
        .returning();
      if (!savedLease) return { status: "run_not_found" as const };

      const currentRun =
        run.status === "queued"
          ? ((
              await tx
                .update(agentRuns)
                .set({ status: "running", updatedAt: input.now })
                .where(eq(agentRuns.id, run.id))
                .returning()
            )[0] ?? { ...run, status: "running", updatedAt: input.now })
          : run;
      return { status: "acquired" as const, run: currentRun, lease: savedLease };
    });
  }

  async heartbeat(input: { runId: string; holderId: string; now: Date; leaseDurationMs: number }) {
    return this.db.transaction(async (tx) => {
      const [run] = await tx
        .select()
        .from(agentRuns)
        .where(eq(agentRuns.id, input.runId))
        .for("update")
        .limit(1);
      if (!run) return { status: "run_not_found" as const };
      if (isTerminalRunStatus(run.status)) {
        await tx.delete(agentLeases).where(eq(agentLeases.runId, input.runId));
        return { status: "terminal" as const };
      }
      const [lease] = await tx
        .select()
        .from(agentLeases)
        .where(eq(agentLeases.runId, input.runId))
        .for("update")
        .limit(1);
      if (!lease) return { status: "not_found" as const };
      if (lease.holderId !== input.holderId) return { status: "owner" as const };
      if (lease.expiresAt.getTime() <= input.now.getTime()) return { status: "expired" as const };
      const [renewed] = await tx
        .update(agentLeases)
        .set({
          heartbeatAt: input.now,
          expiresAt: new Date(input.now.getTime() + input.leaseDurationMs),
        })
        .where(eq(agentLeases.runId, input.runId))
        .returning();
      return renewed
        ? { status: "renewed" as const, lease: renewed }
        : { status: "not_found" as const };
    });
  }

  async createStep(input: { runId: string; stepId: string; name: string; now: Date }) {
    return this.db.transaction(async (tx) => {
      const [run] = await tx
        .select()
        .from(agentRuns)
        .where(eq(agentRuns.id, input.runId))
        .for("update")
        .limit(1);
      if (!run) return { status: "run_not_found" as const };
      if (isTerminalRunStatus(run.status)) return { status: "terminal" as const };
      const [sequenceRow] = await tx
        .select({ value: sql<number>`coalesce(max(${agentSteps.sequence}), 0) + 1` })
        .from(agentSteps)
        .where(eq(agentSteps.runId, input.runId));
      const step: AgentStep = {
        id: input.stepId,
        runId: input.runId,
        sequence: Number(sequenceRow?.value ?? 1),
        status: "queued",
        name: input.name,
        startedAt: null,
        finishedAt: null,
        error: null,
      };
      await tx.insert(agentSteps).values(step);
      const updatedRun = (
        await tx
          .update(agentRuns)
          .set({ currentStepId: step.id, updatedAt: input.now })
          .where(eq(agentRuns.id, input.runId))
          .returning()
      )[0] ?? { ...run, currentStepId: step.id, updatedAt: input.now };
      return { status: "created" as const, run: updatedRun, step };
    });
  }

  async transitionRun(input: { run: AgentRun; expectedStatus: AgentRunStatus }) {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(agentRuns)
        .set({
          status: input.run.status,
          updatedAt: input.run.updatedAt,
        })
        .where(and(eq(agentRuns.id, input.run.id), eq(agentRuns.status, input.expectedStatus)))
        .returning();
      if (!updated) {
        const [current] = await tx
          .select()
          .from(agentRuns)
          .where(eq(agentRuns.id, input.run.id))
          .limit(1);
        return current
          ? { status: "conflict" as const, run: current }
          : { status: "run_not_found" as const };
      }
      if (isTerminalRunStatus(updated.status)) {
        await tx.delete(agentLeases).where(eq(agentLeases.runId, updated.id));
      }
      return { status: "updated" as const, run: updated };
    });
  }

  async transitionStep(input: { step: AgentStep; expectedStatus: AgentStepStatus }) {
    return this.db.transaction(async (tx) => {
      const [currentStep] = await tx
        .select()
        .from(agentSteps)
        .where(eq(agentSteps.id, input.step.id))
        .for("update")
        .limit(1);
      if (!currentStep) return { status: "step_not_found" as const };
      const [run] = await tx
        .select()
        .from(agentRuns)
        .where(eq(agentRuns.id, currentStep.runId))
        .for("update")
        .limit(1);
      if (!run) return { status: "run_not_found" as const };
      if (isTerminalRunStatus(run.status)) return { status: "terminal" as const };
      if (currentStep.status !== input.expectedStatus) {
        return { status: "conflict" as const, step: currentStep };
      }
      const [updated] = await tx
        .update(agentSteps)
        .set({
          runId: input.step.runId,
          sequence: input.step.sequence,
          status: input.step.status,
          name: input.step.name,
          startedAt: input.step.startedAt,
          finishedAt: input.step.finishedAt,
          error: input.step.error,
        })
        .where(eq(agentSteps.id, input.step.id))
        .returning();
      return updated
        ? { status: "updated" as const, step: updated }
        : { status: "step_not_found" as const };
    });
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

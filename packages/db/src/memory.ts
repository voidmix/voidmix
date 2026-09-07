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

export class InMemoryWorkspaceMembershipRepository implements WorkspaceMembershipRepository {
  readonly memberships = new Map<string, WorkspaceMembership>();

  constructor(seed: readonly WorkspaceMembership[] = []) {
    for (const membership of seed) this.memberships.set(membership.id, cloneMembership(membership));
  }

  async getByUserAndWorkspace(input: {
    userId: string;
    workspaceId: string;
  }): Promise<WorkspaceMembership | null> {
    const membership = [...this.memberships.values()].find(
      (candidate) =>
        candidate.userId === input.userId && candidate.workspaceId === input.workspaceId,
    );
    return membership ? cloneMembership(membership) : null;
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

const cloneDate = (value: Date): Date => new Date(value);
const cloneMembership = (membership: WorkspaceMembership): WorkspaceMembership => ({
  ...membership,
  createdAt: cloneDate(membership.createdAt),
  updatedAt: cloneDate(membership.updatedAt),
});
const cloneAsset = (asset: Asset): Asset => ({
  ...asset,
  createdAt: cloneDate(asset.createdAt),
  updatedAt: cloneDate(asset.updatedAt),
});
const cloneAssetVersion = (version: AssetVersion): AssetVersion => ({
  ...version,
  createdAt: cloneDate(version.createdAt),
});
const cloneConflict = (conflict: SyncConflict): SyncConflict => ({
  ...conflict,
  detectedAt: cloneDate(conflict.detectedAt),
  ...(conflict.resolvedAt ? { resolvedAt: cloneDate(conflict.resolvedAt) } : {}),
});
const cloneRun = (run: AgentRun): AgentRun => ({
  ...run,
  createdAt: cloneDate(run.createdAt),
  updatedAt: cloneDate(run.updatedAt),
});
const cloneStep = (step: AgentStep): AgentStep => ({
  ...step,
  ...(step.startedAt ? { startedAt: cloneDate(step.startedAt) } : {}),
  ...(step.finishedAt ? { finishedAt: cloneDate(step.finishedAt) } : {}),
});
const cloneLease = (lease: AgentLease): AgentLease => ({
  ...lease,
  acquiredAt: cloneDate(lease.acquiredAt),
  heartbeatAt: cloneDate(lease.heartbeatAt),
  expiresAt: cloneDate(lease.expiresAt),
});

export class InMemoryAssetRepository implements AssetRepository {
  readonly assets = new Map<string, Asset>();

  constructor(seed: readonly Asset[] = []) {
    for (const asset of seed) this.assets.set(asset.id, cloneAsset(asset));
  }

  async getById(id: string): Promise<Asset | null> {
    const asset = this.assets.get(id);
    return asset ? cloneAsset(asset) : null;
  }

  async getByPath(input: { workspaceId: string; path: string }): Promise<Asset | null> {
    const asset = [...this.assets.values()].find(
      (candidate) => candidate.workspaceId === input.workspaceId && candidate.path === input.path,
    );
    return asset ? cloneAsset(asset) : null;
  }

  async createIfPathAvailable(asset: Asset) {
    const existing = [...this.assets.values()].find(
      (candidate) => candidate.workspaceId === asset.workspaceId && candidate.path === asset.path,
    );
    if (existing) return { status: "path_conflict" as const };
    const stored = cloneAsset(asset);
    this.assets.set(asset.id, stored);
    return { status: "created" as const, asset: cloneAsset(stored) };
  }
}

export class InMemoryAssetVersionRepository implements AssetVersionRepository {
  readonly versions = new Map<string, AssetVersion>();

  constructor(seed: readonly AssetVersion[] = []) {
    for (const version of seed) this.versions.set(version.id, cloneAssetVersion(version));
  }

  async getById(id: string): Promise<AssetVersion | null> {
    const version = this.versions.get(id);
    return version ? cloneAssetVersion(version) : null;
  }

  async getByIdempotencyKey(input: {
    assetId: string;
    idempotencyKey: string;
  }): Promise<AssetVersion | null> {
    const version = [...this.versions.values()].find(
      (candidate) =>
        candidate.assetId === input.assetId && candidate.idempotencyKey === input.idempotencyKey,
    );
    return version ? cloneAssetVersion(version) : null;
  }
}

/** Build a complete in-memory asset repository graph with atomic head commits. */
export function createInMemoryAssetRepositories(): {
  assets: InMemoryAssetRepository;
  versions: InMemoryAssetVersionRepository;
  conflicts: InMemorySyncConflictRepository;
  commitVersion(input: {
    version: AssetVersion;
    expectedHeadVersionId: string | null;
  }): Promise<AssetVersionCommitOutcome>;
} {
  const assets = new InMemoryAssetRepository();
  const versions = new InMemoryAssetVersionRepository();
  const conflicts = new InMemorySyncConflictRepository();
  let commitTail: Promise<void> = Promise.resolve();

  const commitVersion = (input: {
    version: AssetVersion;
    expectedHeadVersionId: string | null;
  }): Promise<AssetVersionCommitOutcome> => {
    const operation = commitTail.then(() => {
      const asset = assets.assets.get(input.version.assetId);
      if (!asset) return { status: "not_found" as const };

      // Idempotent retries must be replayed before evaluating the caller's
      // observed head. A successful first request may already have advanced
      // the head by the time a concurrent retry enters this critical section.
      const existing = [...versions.versions.values()].find(
        (candidate) =>
          candidate.assetId === input.version.assetId &&
          candidate.idempotencyKey === input.version.idempotencyKey,
      );
      if (existing) {
        return {
          status: "committed" as const,
          version: cloneAssetVersion(existing),
          asset: cloneAsset(asset),
        };
      }

      if (asset.workspaceId !== input.version.workspaceId || asset.status !== "active") {
        return { status: "not_found" as const };
      }
      if (asset.headVersionId !== input.expectedHeadVersionId) {
        return {
          status: "head_conflict" as const,
          actualHeadVersionId: asset.headVersionId,
        };
      }

      versions.versions.set(input.version.id, cloneAssetVersion(input.version));
      const updated = {
        ...asset,
        headVersionId: input.version.id,
        updatedAt: input.version.createdAt,
      };
      assets.assets.set(asset.id, cloneAsset(updated));
      return {
        status: "committed" as const,
        version: cloneAssetVersion(input.version),
        asset: cloneAsset(updated),
      };
    });
    // A failed operation must not permanently poison the queue.
    commitTail = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  };
  return {
    assets,
    versions,
    conflicts,
    commitVersion,
  };
}

export class InMemorySyncConflictRepository implements SyncConflictRepository {
  readonly conflicts = new Map<string, SyncConflict>();

  constructor(seed: readonly SyncConflict[] = []) {
    for (const conflict of seed) this.conflicts.set(conflict.id, cloneConflict(conflict));
  }

  async getById(id: string): Promise<SyncConflict | null> {
    const conflict = this.conflicts.get(id);
    return conflict ? cloneConflict(conflict) : null;
  }

  async save(conflict: SyncConflict): Promise<void> {
    this.conflicts.set(conflict.id, cloneConflict(conflict));
  }

  async resolve(conflict: SyncConflict) {
    const current = this.conflicts.get(conflict.id);
    if (!current) return { status: "not_found" as const };
    if (current.status === "resolved") {
      return { status: "already_resolved" as const, conflict: cloneConflict(current) };
    }
    const resolved = cloneConflict(conflict);
    this.conflicts.set(conflict.id, resolved);
    return { status: "resolved" as const, conflict: cloneConflict(resolved) };
  }
}

export class InMemoryAgentRunRepository implements AgentRunRepository {
  readonly runs = new Map<string, AgentRun>();

  constructor(seed: readonly AgentRun[] = []) {
    for (const run of seed) this.runs.set(run.id, cloneRun(run));
  }

  async getById(id: string): Promise<AgentRun | null> {
    const run = this.runs.get(id);
    return run ? cloneRun(run) : null;
  }

  async save(run: AgentRun): Promise<void> {
    this.runs.set(run.id, cloneRun(run));
  }
}

export class InMemoryAgentStepRepository implements AgentStepRepository {
  readonly steps = new Map<string, AgentStep>();

  constructor(seed: readonly AgentStep[] = []) {
    for (const step of seed) this.steps.set(step.id, cloneStep(step));
  }

  async getById(id: string): Promise<AgentStep | null> {
    const step = this.steps.get(id);
    return step ? cloneStep(step) : null;
  }
}

export class InMemoryAgentLeaseRepository implements AgentLeaseRepository {
  readonly leases = new Map<string, AgentLease>();

  constructor(seed: readonly AgentLease[] = []) {
    for (const lease of seed) this.leases.set(lease.runId, cloneLease(lease));
  }

  async getByRunId(runId: string): Promise<AgentLease | null> {
    const lease = this.leases.get(runId);
    return lease ? cloneLease(lease) : null;
  }
}

/**
 * Atomic Agent commands for the in-memory adapter. The queue mirrors the row
 * locks used by the PostgreSQL implementation and makes race tests behave
 * like production even though each individual map operation is synchronous.
 */
export class InMemoryAgentCommandRepository implements AgentCommandRepository {
  private tail: Promise<void> = Promise.resolve();

  constructor(
    private readonly runs: InMemoryAgentRunRepository,
    private readonly steps: InMemoryAgentStepRepository,
    private readonly leases: InMemoryAgentLeaseRepository,
  ) {}

  private enqueue<Result>(operation: () => Result): Promise<Result> {
    const result = this.tail.then(operation);
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  acquireLease(input: { runId: string; holderId: string; now: Date; leaseDurationMs: number }) {
    return this.enqueue(() => {
      const run = this.runs.runs.get(input.runId);
      if (!run) return { status: "run_not_found" as const };
      if (run.status === "succeeded" || run.status === "failed" || run.status === "cancelled") {
        return { status: "terminal" as const };
      }
      const existing = this.leases.leases.get(input.runId);
      const existingIsActive =
        existing !== undefined && existing.expiresAt.getTime() > input.now.getTime();
      if (existingIsActive) {
        if (existing.holderId !== input.holderId)
          return { status: "held" as const, lease: cloneLease(existing) };
      }
      const lease: AgentLease = {
        runId: input.runId,
        holderId: input.holderId,
        acquiredAt: existingIsActive ? existing.acquiredAt : input.now,
        heartbeatAt: input.now,
        expiresAt: new Date(input.now.getTime() + input.leaseDurationMs),
      };
      this.leases.leases.set(input.runId, cloneLease(lease));
      const updatedRun: AgentRun =
        run.status === "queued"
          ? { ...run, status: "running", updatedAt: input.now }
          : cloneRun(run);
      this.runs.runs.set(run.id, cloneRun(updatedRun));
      return { status: "acquired" as const, run: updatedRun, lease: cloneLease(lease) };
    });
  }

  heartbeat(input: { runId: string; holderId: string; now: Date; leaseDurationMs: number }) {
    return this.enqueue(() => {
      const run = this.runs.runs.get(input.runId);
      if (!run) return { status: "run_not_found" as const };
      if (run.status === "succeeded" || run.status === "failed" || run.status === "cancelled") {
        this.leases.leases.delete(input.runId);
        return { status: "terminal" as const };
      }
      const lease = this.leases.leases.get(input.runId);
      if (!lease) return { status: "not_found" as const };
      if (lease.holderId !== input.holderId) return { status: "owner" as const };
      if (lease.expiresAt.getTime() <= input.now.getTime()) return { status: "expired" as const };
      const renewed: AgentLease = {
        ...lease,
        heartbeatAt: input.now,
        expiresAt: new Date(input.now.getTime() + input.leaseDurationMs),
      };
      this.leases.leases.set(input.runId, cloneLease(renewed));
      return { status: "renewed" as const, lease: cloneLease(renewed) };
    });
  }

  createStep(input: { runId: string; stepId: string; name: string; now: Date }) {
    return this.enqueue(() => {
      const run = this.runs.runs.get(input.runId);
      if (!run) return { status: "run_not_found" as const };
      if (run.status === "succeeded" || run.status === "failed" || run.status === "cancelled") {
        return { status: "terminal" as const };
      }
      const sequence =
        [...this.steps.steps.values()]
          .filter((step) => step.runId === input.runId)
          .reduce((max, step) => Math.max(max, step.sequence), 0) + 1;
      const step: AgentStep = {
        id: input.stepId,
        runId: input.runId,
        sequence,
        status: "queued",
        name: input.name,
        startedAt: null,
        finishedAt: null,
        error: null,
      };
      this.steps.steps.set(step.id, cloneStep(step));
      const updatedRun: AgentRun = {
        ...run,
        currentStepId: step.id,
        updatedAt: input.now,
      };
      this.runs.runs.set(run.id, cloneRun(updatedRun));
      return { status: "created" as const, run: updatedRun, step: cloneStep(step) };
    });
  }

  transitionRun(input: { run: AgentRun; expectedStatus: AgentRunStatus }) {
    return this.enqueue(() => {
      const current = this.runs.runs.get(input.run.id);
      if (!current) return { status: "run_not_found" as const };
      if (current.status !== input.expectedStatus)
        return { status: "conflict" as const, run: cloneRun(current) };
      // The service passes a snapshot so the adapter can compare the expected
      // status. Preserve fields written by commands that raced ahead while the
      // snapshot was being prepared (for example currentStepId from createStep).
      const updated: AgentRun = {
        ...current,
        status: input.run.status,
        updatedAt: input.run.updatedAt,
      };
      this.runs.runs.set(input.run.id, cloneRun(updated));
      if (isTerminalRunStatus(updated.status)) this.leases.leases.delete(input.run.id);
      return { status: "updated" as const, run: cloneRun(updated) };
    });
  }

  transitionStep(input: { step: AgentStep; expectedStatus: AgentStepStatus }) {
    return this.enqueue(() => {
      const run = this.runs.runs.get(input.step.runId);
      if (!run) return { status: "run_not_found" as const };
      if (isTerminalRunStatus(run.status)) return { status: "terminal" as const };
      const current = this.steps.steps.get(input.step.id);
      if (!current) return { status: "step_not_found" as const };
      if (current.status !== input.expectedStatus)
        return { status: "conflict" as const, step: cloneStep(current) };
      this.steps.steps.set(input.step.id, cloneStep(input.step));
      return { status: "updated" as const, step: cloneStep(input.step) };
    });
  }
}

/** Build a complete in-memory Agent repository graph with atomic commands. */
export function createInMemoryAgentRepositories(): {
  runs: InMemoryAgentRunRepository;
  steps: InMemoryAgentStepRepository;
  leases: InMemoryAgentLeaseRepository;
  commands: InMemoryAgentCommandRepository;
} {
  const runs = new InMemoryAgentRunRepository();
  const steps = new InMemoryAgentStepRepository();
  const leases = new InMemoryAgentLeaseRepository();
  return { runs, steps, leases, commands: new InMemoryAgentCommandRepository(runs, steps, leases) };
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

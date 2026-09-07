import { DomainError } from "../shared/errors.js";
import { defaultClock, defaultIdGenerator } from "../shared/types.js";

/** Domain state machine for durable, permissioned Agent runs. */

export const agentRunStatuses = [
  "queued",
  "running",
  "waiting_for_approval",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export type AgentRunStatus = (typeof agentRunStatuses)[number];

export const agentStepStatuses = [
  "queued",
  "running",
  "waiting_for_approval",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export type AgentStepStatus = (typeof agentStepStatuses)[number];

export const toolCapabilities = [
  "asset.read",
  "asset.write",
  "project.read",
  "project.write",
  "network.fetch",
  "process.execute",
] as const;
export type ToolCapability = (typeof toolCapabilities)[number];

export type AgentDomainErrorCode =
  | "AGENT_RUN_NOT_FOUND"
  | "AGENT_STEP_NOT_FOUND"
  | "AGENT_INVALID_STATUS_TRANSITION"
  | "AGENT_CONCURRENT_MODIFICATION"
  | "AGENT_TERMINAL_RUN"
  | "AGENT_LEASE_NOT_FOUND"
  | "AGENT_LEASE_HELD"
  | "AGENT_LEASE_EXPIRED"
  | "AGENT_LEASE_OWNER"
  | "AGENT_TOOL_NOT_ALLOWED"
  | "AGENT_INVALID_INPUT";

export class AgentDomainError extends DomainError<AgentDomainErrorCode> {
  constructor(code: AgentDomainErrorCode, message: string) {
    super(code, message);
    this.name = "AgentDomainError";
  }
}

export interface AgentRun {
  id: string;
  workspaceId: string;
  requestedBy: string;
  status: AgentRunStatus;
  goal: string;
  createdAt: Date;
  updatedAt: Date;
  currentStepId: string | null;
}

export interface AgentStep {
  id: string;
  runId: string;
  sequence: number;
  status: AgentStepStatus;
  name: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  error: string | null;
}

export interface AgentLease {
  runId: string;
  holderId: string;
  acquiredAt: Date;
  heartbeatAt: Date;
  expiresAt: Date;
}

export interface AgentRunRepository {
  getById(id: string): Promise<AgentRun | null>;
  /** Initial creation is independent of a transition command. */
  save(run: AgentRun): Promise<void>;
}

export interface AgentStepRepository {
  getById(id: string): Promise<AgentStep | null>;
}

export interface AgentLeaseRepository {
  getByRunId(runId: string): Promise<AgentLease | null>;
}

export type AgentLeaseAcquireOutcome =
  | { status: "acquired"; run: AgentRun; lease: AgentLease }
  | { status: "run_not_found" }
  | { status: "terminal" }
  | { status: "held"; lease: AgentLease };

export type AgentLeaseHeartbeatOutcome =
  | { status: "renewed"; lease: AgentLease }
  | { status: "run_not_found" }
  | { status: "terminal" }
  | { status: "not_found" }
  | { status: "owner" }
  | { status: "expired" };

export type AgentStepCreateOutcome =
  | { status: "created"; run: AgentRun; step: AgentStep }
  | { status: "run_not_found" }
  | { status: "terminal" };

export type AgentRunTransitionOutcome =
  | { status: "updated"; run: AgentRun }
  | { status: "run_not_found" }
  | { status: "conflict"; run: AgentRun };

export type AgentStepTransitionOutcome =
  | { status: "updated"; step: AgentStep }
  | { status: "step_not_found" }
  | { status: "run_not_found" }
  | { status: "terminal" }
  | { status: "conflict"; step: AgentStep };

/**
 * Commands that span Agent records. Adapters must implement each command as
 * one atomic operation so workers cannot double-lease a run, allocate the
 * same step sequence, or overwrite a state transition they did not observe.
 */
export interface AgentCommandRepository {
  acquireLease(input: {
    runId: string;
    holderId: string;
    now: Date;
    leaseDurationMs: number;
  }): Promise<AgentLeaseAcquireOutcome>;
  heartbeat(input: {
    runId: string;
    holderId: string;
    now: Date;
    leaseDurationMs: number;
  }): Promise<AgentLeaseHeartbeatOutcome>;
  createStep(input: {
    runId: string;
    stepId: string;
    name: string;
    now: Date;
  }): Promise<AgentStepCreateOutcome>;
  transitionRun(input: {
    run: AgentRun;
    expectedStatus: AgentRunStatus;
  }): Promise<AgentRunTransitionOutcome>;
  transitionStep(input: {
    step: AgentStep;
    expectedStatus: AgentStepStatus;
  }): Promise<AgentStepTransitionOutcome>;
}

export interface AgentRepositories {
  runs: AgentRunRepository;
  steps: AgentStepRepository;
  leases: AgentLeaseRepository;
  commands: AgentCommandRepository;
}

export interface CreateAgentRunInput {
  workspaceId: string;
  requestedBy: string;
  goal: string;
}

export interface ToolAuthorization {
  allowed: readonly ToolCapability[];
  workspaceId: string;
  assetIds?: readonly string[];
  projectIds?: readonly string[];
}

export interface ToolResourceScope {
  workspaceId: string;
  assetId?: string;
  projectId?: string;
}

const terminalRunStatuses: readonly AgentRunStatus[] = ["succeeded", "failed", "cancelled"];
const terminalStepStatuses: readonly AgentStepStatus[] = ["succeeded", "failed", "cancelled"];

const runTransitions: Record<AgentRunStatus, readonly AgentRunStatus[]> = {
  queued: ["running", "cancelled"],
  running: ["waiting_for_approval", "succeeded", "failed", "cancelled"],
  waiting_for_approval: ["running", "cancelled", "failed"],
  succeeded: [],
  failed: [],
  cancelled: [],
};

const stepTransitions: Record<AgentStepStatus, readonly AgentStepStatus[]> = {
  queued: ["running", "cancelled"],
  running: ["waiting_for_approval", "succeeded", "failed", "cancelled"],
  waiting_for_approval: ["running", "cancelled", "failed"],
  succeeded: [],
  failed: [],
  cancelled: [],
};

export function isTerminalRunStatus(status: AgentRunStatus): boolean {
  return terminalRunStatuses.includes(status);
}

export function isTerminalStepStatus(status: AgentStepStatus): boolean {
  return terminalStepStatuses.includes(status);
}

export function canTransitionRunStatus(from: AgentRunStatus, to: AgentRunStatus): boolean {
  return from === to || runTransitions[from].includes(to);
}

export function canTransitionStepStatus(from: AgentStepStatus, to: AgentStepStatus): boolean {
  return from === to || stepTransitions[from].includes(to);
}

export function assertRunTransition(from: AgentRunStatus, to: AgentRunStatus): void {
  if (!canTransitionRunStatus(from, to)) {
    throw new AgentDomainError(
      "AGENT_INVALID_STATUS_TRANSITION",
      `Cannot transition an Agent run from ${from} to ${to}.`,
    );
  }
}

export function assertStepTransition(from: AgentStepStatus, to: AgentStepStatus): void {
  if (!canTransitionStepStatus(from, to)) {
    throw new AgentDomainError(
      "AGENT_INVALID_STATUS_TRANSITION",
      `Cannot transition an Agent step from ${from} to ${to}.`,
    );
  }
}

export function isLeaseActive(lease: AgentLease, now: Date): boolean {
  return lease.expiresAt.getTime() > now.getTime();
}

export function assertToolCapability(
  capability: ToolCapability,
  authorization: ToolAuthorization,
  scope?: ToolResourceScope,
): void {
  if (!authorization.allowed.includes(capability)) {
    throw new AgentDomainError(
      "AGENT_TOOL_NOT_ALLOWED",
      `The Agent is not allowed to use ${capability}.`,
    );
  }
  if (scope && scope.workspaceId !== authorization.workspaceId) {
    throw new AgentDomainError(
      "AGENT_TOOL_NOT_ALLOWED",
      "The Agent cannot access another workspace.",
    );
  }
  if (scope?.assetId && capability.startsWith("asset.")) {
    if (!authorization.assetIds?.includes(scope.assetId)) {
      throw new AgentDomainError(
        "AGENT_TOOL_NOT_ALLOWED",
        "The Agent is not scoped to this asset.",
      );
    }
  }
  if (scope?.projectId && capability.startsWith("project.")) {
    if (!authorization.projectIds?.includes(scope.projectId)) {
      throw new AgentDomainError(
        "AGENT_TOOL_NOT_ALLOWED",
        "The Agent is not scoped to this project.",
      );
    }
  }
}

export function createAgentAdministration(options: {
  repositories: AgentRepositories;
  now?: () => Date;
  id?: () => string;
  leaseDurationMs?: number;
}) {
  const now = options.now ?? (() => defaultClock.now());
  const id = options.id ?? (() => defaultIdGenerator.next());
  const leaseDurationMs = options.leaseDurationMs ?? 30_000;

  if (!Number.isSafeInteger(leaseDurationMs) || leaseDurationMs <= 0) {
    throw new AgentDomainError(
      "AGENT_INVALID_INPUT",
      "Agent lease duration must be a positive integer.",
    );
  }

  return {
    async createRun(input: CreateAgentRunInput): Promise<AgentRun> {
      const workspaceId = input.workspaceId.trim();
      const requestedBy = input.requestedBy.trim();
      const goal = input.goal.trim();
      if (!workspaceId || !requestedBy || !goal) {
        throw new AgentDomainError(
          "AGENT_INVALID_INPUT",
          "Agent runs require a workspace, requester, and goal.",
        );
      }
      const timestamp = now();
      const run: AgentRun = {
        id: id(),
        workspaceId,
        requestedBy,
        status: "queued",
        goal,
        createdAt: timestamp,
        updatedAt: timestamp,
        currentStepId: null,
      };
      await options.repositories.runs.save(run);
      return run;
    },

    async getRun(runId: string): Promise<AgentRun | null> {
      return options.repositories.runs.getById(runId);
    },

    async transitionRun(input: { runId: string; status: AgentRunStatus }): Promise<AgentRun> {
      const run = await options.repositories.runs.getById(input.runId);
      if (!run)
        throw new AgentDomainError(
          "AGENT_RUN_NOT_FOUND",
          "The requested Agent run does not exist.",
        );
      assertRunTransition(run.status, input.status);
      if (run.status === input.status) {
        return run;
      }
      const updated: AgentRun = { ...run, status: input.status, updatedAt: now() };
      const result = await options.repositories.commands.transitionRun({
        run: updated,
        expectedStatus: run.status,
      });
      if (result.status === "updated") return result.run;
      if (result.status === "run_not_found") {
        throw new AgentDomainError(
          "AGENT_RUN_NOT_FOUND",
          "The requested Agent run does not exist.",
        );
      }
      throw new AgentDomainError(
        "AGENT_CONCURRENT_MODIFICATION",
        "The Agent run changed while this transition was being applied.",
      );
    },

    async acquireLease(input: { runId: string; holderId: string }): Promise<AgentLease> {
      const holderId = input.holderId.trim();
      if (!holderId)
        throw new AgentDomainError("AGENT_INVALID_INPUT", "Agent leases require a holder.");
      const timestamp = now();
      const result = await options.repositories.commands.acquireLease({
        runId: input.runId,
        holderId,
        now: timestamp,
        leaseDurationMs,
      });
      switch (result.status) {
        case "acquired":
          return result.lease;
        case "run_not_found":
          throw new AgentDomainError(
            "AGENT_RUN_NOT_FOUND",
            "The requested Agent run does not exist.",
          );
        case "terminal":
          throw new AgentDomainError(
            "AGENT_TERMINAL_RUN",
            "A terminal Agent run cannot be leased.",
          );
        case "held":
          throw new AgentDomainError(
            "AGENT_LEASE_HELD",
            "The Agent run is currently leased by another worker.",
          );
      }
    },

    async heartbeat(input: { runId: string; holderId: string }): Promise<AgentLease> {
      const holderId = input.holderId.trim();
      if (!holderId)
        throw new AgentDomainError("AGENT_INVALID_INPUT", "Agent leases require a holder.");
      const timestamp = now();
      const result = await options.repositories.commands.heartbeat({
        runId: input.runId,
        holderId,
        now: timestamp,
        leaseDurationMs,
      });
      switch (result.status) {
        case "renewed":
          return result.lease;
        case "run_not_found":
          throw new AgentDomainError(
            "AGENT_RUN_NOT_FOUND",
            "The requested Agent run does not exist.",
          );
        case "terminal":
          throw new AgentDomainError(
            "AGENT_TERMINAL_RUN",
            "A terminal Agent run cannot be heartbeated.",
          );
        case "not_found":
          throw new AgentDomainError("AGENT_LEASE_NOT_FOUND", "The Agent run has no lease.");
        case "owner":
          throw new AgentDomainError(
            "AGENT_LEASE_OWNER",
            "Only the lease holder may heartbeat the Agent run.",
          );
        case "expired":
          throw new AgentDomainError("AGENT_LEASE_EXPIRED", "The Agent run lease has expired.");
      }
    },

    async createStep(input: { runId: string; name: string }): Promise<AgentStep> {
      if (!input.name.trim())
        throw new AgentDomainError("AGENT_INVALID_INPUT", "Agent steps require a name.");
      const result = await options.repositories.commands.createStep({
        runId: input.runId,
        stepId: id(),
        name: input.name.trim(),
        now: now(),
      });
      switch (result.status) {
        case "created":
          return result.step;
        case "run_not_found":
          throw new AgentDomainError(
            "AGENT_RUN_NOT_FOUND",
            "The requested Agent run does not exist.",
          );
        case "terminal":
          throw new AgentDomainError(
            "AGENT_TERMINAL_RUN",
            "A terminal Agent run cannot receive more steps.",
          );
      }
    },

    async getStep(stepId: string): Promise<AgentStep | null> {
      return options.repositories.steps.getById(stepId);
    },

    async transitionStep(input: {
      stepId: string;
      status: AgentStepStatus;
      error?: string | null;
    }): Promise<AgentStep> {
      const step = await options.repositories.steps.getById(input.stepId);
      if (!step)
        throw new AgentDomainError(
          "AGENT_STEP_NOT_FOUND",
          "The requested Agent step does not exist.",
        );
      const run = await options.repositories.runs.getById(step.runId);
      if (!run)
        throw new AgentDomainError(
          "AGENT_RUN_NOT_FOUND",
          "The requested Agent run does not exist.",
        );
      if (isTerminalRunStatus(run.status)) {
        throw new AgentDomainError(
          "AGENT_TERMINAL_RUN",
          "A terminal Agent run cannot change its steps.",
        );
      }
      assertStepTransition(step.status, input.status);
      if (step.status === input.status && input.error === undefined) return step;
      const timestamp = now();
      const startedAt = step.startedAt ?? (input.status === "running" ? timestamp : null);
      const finishedAt = isTerminalStepStatus(input.status) ? (step.finishedAt ?? timestamp) : null;
      const updated: AgentStep = {
        ...step,
        status: input.status,
        startedAt,
        finishedAt,
        ...(input.error === undefined ? {} : { error: input.error }),
      };
      const result = await options.repositories.commands.transitionStep({
        step: updated,
        expectedStatus: step.status,
      });
      switch (result.status) {
        case "updated":
          return result.step;
        case "step_not_found":
          throw new AgentDomainError(
            "AGENT_STEP_NOT_FOUND",
            "The requested Agent step does not exist.",
          );
        case "run_not_found":
          throw new AgentDomainError(
            "AGENT_RUN_NOT_FOUND",
            "The requested Agent run does not exist.",
          );
        case "terminal":
          throw new AgentDomainError(
            "AGENT_TERMINAL_RUN",
            "A terminal Agent run cannot change its steps.",
          );
        case "conflict":
          throw new AgentDomainError(
            "AGENT_CONCURRENT_MODIFICATION",
            "The Agent step changed while this transition was being applied.",
          );
      }
    },

    authorizeTool(
      capability: ToolCapability,
      authorization: ToolAuthorization,
      scope?: ToolResourceScope,
    ): true {
      assertToolCapability(capability, authorization, scope);
      return true;
    },
  };
}

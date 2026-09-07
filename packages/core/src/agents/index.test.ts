import { describe, expect, it } from "vite-plus/test";
import {
  AgentDomainError,
  createAgentAdministration,
  isTerminalRunStatus,
  isLeaseActive,
  type AgentCommandRepository,
  type AgentLease,
  type AgentLeaseRepository,
  type AgentRun,
  type AgentRunRepository,
  type AgentStep,
  type AgentStepRepository,
} from "./index";

function repositories() {
  const runs = new Map<string, AgentRun>();
  const steps = new Map<string, AgentStep>();
  const leases = new Map<string, AgentLease>();
  const runRepository: AgentRunRepository = {
    async getById(id) {
      return runs.get(id) ?? null;
    },
    async save(run) {
      runs.set(run.id, run);
    },
  };
  const stepRepository: AgentStepRepository = {
    async getById(id) {
      return steps.get(id) ?? null;
    },
  };
  const leaseRepository: AgentLeaseRepository = {
    async getByRunId(runId) {
      return leases.get(runId) ?? null;
    },
  };
  const commandRepository: AgentCommandRepository = {
    async acquireLease({ runId, holderId, now, leaseDurationMs }) {
      const run = runs.get(runId);
      if (!run) return { status: "run_not_found" };
      if (isTerminalRunStatus(run.status)) return { status: "terminal" };
      const existing = leases.get(runId);
      const existingIsActive = existing !== undefined && existing.expiresAt > now;
      if (existingIsActive && existing.holderId !== holderId)
        return { status: "held", lease: existing };
      const lease = {
        runId,
        holderId,
        acquiredAt: existingIsActive ? existing.acquiredAt : now,
        heartbeatAt: now,
        expiresAt: new Date(now.getTime() + leaseDurationMs),
      };
      leases.set(runId, lease);
      const updatedRun =
        run.status === "queued" ? { ...run, status: "running" as const, updatedAt: now } : run;
      runs.set(runId, updatedRun);
      return { status: "acquired", run: updatedRun, lease };
    },
    async heartbeat({ runId, holderId, now, leaseDurationMs }) {
      const run = runs.get(runId);
      if (!run) return { status: "run_not_found" };
      if (isTerminalRunStatus(run.status)) {
        leases.delete(runId);
        return { status: "terminal" };
      }
      const lease = leases.get(runId);
      if (!lease) return { status: "not_found" };
      if (lease.holderId !== holderId) return { status: "owner" };
      if (lease.expiresAt <= now) return { status: "expired" };
      const renewed = {
        ...lease,
        heartbeatAt: now,
        expiresAt: new Date(now.getTime() + leaseDurationMs),
      };
      leases.set(runId, renewed);
      return { status: "renewed", lease: renewed };
    },
    async createStep({ runId, stepId, name, now }) {
      const run = runs.get(runId);
      if (!run) return { status: "run_not_found" };
      if (isTerminalRunStatus(run.status)) return { status: "terminal" };
      const sequence = [...steps.values()].filter((step) => step.runId === runId).length + 1;
      const step = {
        id: stepId,
        runId,
        sequence,
        status: "queued" as const,
        name,
        startedAt: null,
        finishedAt: null,
        error: null,
      };
      steps.set(stepId, step);
      const updatedRun = { ...run, currentStepId: stepId, updatedAt: now };
      runs.set(runId, updatedRun);
      return { status: "created", run: updatedRun, step };
    },
    async transitionRun({ run, expectedStatus }) {
      const current = runs.get(run.id);
      if (!current) return { status: "run_not_found" };
      if (current.status !== expectedStatus) return { status: "conflict", run: current };
      runs.set(run.id, run);
      if (isTerminalRunStatus(run.status)) leases.delete(run.id);
      return { status: "updated", run };
    },
    async transitionStep({ step, expectedStatus }) {
      const run = runs.get(step.runId);
      if (!run) return { status: "run_not_found" };
      if (isTerminalRunStatus(run.status)) return { status: "terminal" };
      const current = steps.get(step.id);
      if (!current) return { status: "step_not_found" };
      if (current.status !== expectedStatus) return { status: "conflict", step: current };
      steps.set(step.id, step);
      return { status: "updated", step };
    },
  };
  return {
    repositories: {
      runs: runRepository,
      steps: stepRepository,
      leases: leaseRepository,
      commands: commandRepository,
    },
    runs,
    steps,
    leases,
  };
}

const baseTime = new Date("2026-09-08T00:00:00.000Z");

describe("agent domain", () => {
  it("creates a queued run and transitions it through a step", async () => {
    const memory = repositories();
    let sequence = 0;
    const service = createAgentAdministration({
      repositories: memory.repositories,
      now: () => baseTime,
      id: () => `id-${++sequence}`,
    });
    const run = await service.createRun({
      workspaceId: "ws-1",
      requestedBy: "user-1",
      goal: "Render hero variations",
    });
    expect(run.status).toBe("queued");
    const lease = await service.acquireLease({ runId: run.id, holderId: "worker-1" });
    expect(lease.holderId).toBe("worker-1");
    expect(memory.runs.get(run.id)?.status).toBe("running");
    const step = await service.createStep({ runId: run.id, name: "Generate prompt" });
    expect(step.sequence).toBe(1);
    const started = await service.transitionStep({ stepId: step.id, status: "running" });
    expect(started.startedAt).toEqual(baseTime);
    const done = await service.transitionStep({ stepId: step.id, status: "succeeded" });
    expect(done.finishedAt).toEqual(baseTime);
  });

  it("rejects invalid terminal transitions", async () => {
    const memory = repositories();
    const service = createAgentAdministration({
      repositories: memory.repositories,
      id: () => "run-id",
    });
    const run = await service.createRun({
      workspaceId: "ws-1",
      requestedBy: "user-1",
      goal: "Do work",
    });
    await service.transitionRun({ runId: run.id, status: "cancelled" });
    await expect(service.transitionRun({ runId: run.id, status: "running" })).rejects.toMatchObject(
      { code: "AGENT_INVALID_STATUS_TRANSITION" },
    );
  });

  it("removes a lease when a run becomes terminal", async () => {
    const memory = repositories();
    const service = createAgentAdministration({
      repositories: memory.repositories,
      id: () => "run-id",
    });
    const run = await service.createRun({
      workspaceId: "ws-1",
      requestedBy: "user-1",
      goal: "Do work",
    });
    await service.acquireLease({ runId: run.id, holderId: "worker-1" });
    await service.transitionRun({ runId: run.id, status: "cancelled" });
    expect(memory.leases.has(run.id)).toBe(false);
  });

  it("allows only one live lease owner and renews an owned lease", async () => {
    const memory = repositories();
    let current = baseTime;
    const service = createAgentAdministration({
      repositories: memory.repositories,
      now: () => current,
      leaseDurationMs: 1000,
      id: () => "run-id",
    });
    const run = await service.createRun({
      workspaceId: "ws-1",
      requestedBy: "user-1",
      goal: "Do work",
    });
    const first = await service.acquireLease({ runId: run.id, holderId: "worker-1" });
    await expect(
      service.acquireLease({ runId: run.id, holderId: "worker-2" }),
    ).rejects.toMatchObject({ code: "AGENT_LEASE_HELD" });
    current = new Date(baseTime.getTime() + 500);
    const renewed = await service.heartbeat({ runId: run.id, holderId: "worker-1" });
    expect(renewed.expiresAt.getTime()).toBe(baseTime.getTime() + 1500);
    expect(isLeaseActive(first, baseTime)).toBe(true);
    await expect(service.heartbeat({ runId: run.id, holderId: "worker-2" })).rejects.toMatchObject({
      code: "AGENT_LEASE_OWNER",
    });
    current = new Date(baseTime.getTime() + 1501);
    const takeover = await service.acquireLease({ runId: run.id, holderId: "worker-2" });
    expect(takeover.acquiredAt).toEqual(current);
  });

  it("rejects heartbeat after expiry", async () => {
    const memory = repositories();
    let current = baseTime;
    const service = createAgentAdministration({
      repositories: memory.repositories,
      now: () => current,
      leaseDurationMs: 1000,
      id: () => "run-id",
    });
    const run = await service.createRun({
      workspaceId: "ws-1",
      requestedBy: "user-1",
      goal: "Do work",
    });
    await service.acquireLease({ runId: run.id, holderId: "worker-1" });
    current = new Date(baseTime.getTime() + 1001);
    await expect(service.heartbeat({ runId: run.id, holderId: "worker-1" })).rejects.toMatchObject({
      code: "AGENT_LEASE_EXPIRED",
    });
  });

  it("enforces tool capabilities", async () => {
    const memory = repositories();
    const service = createAgentAdministration({ repositories: memory.repositories });
    expect(
      service.authorizeTool("asset.read", { allowed: ["asset.read"], workspaceId: "ws-1" }),
    ).toBe(true);
    expect(() =>
      service.authorizeTool("process.execute", { allowed: ["asset.read"], workspaceId: "ws-1" }),
    ).toThrowError(AgentDomainError);
    expect(() =>
      service.authorizeTool(
        "asset.read",
        { allowed: ["asset.read"], workspaceId: "ws-1" },
        { workspaceId: "ws-2" },
      ),
    ).toThrowError(AgentDomainError);
    expect(() =>
      service.authorizeTool(
        "asset.read",
        { allowed: ["asset.read"], workspaceId: "ws-1", assetIds: ["asset-1"] },
        { workspaceId: "ws-1", assetId: "asset-2" },
      ),
    ).toThrowError(AgentDomainError);
  });
});

import {
  AgentRunV2DomainError,
  assertAgentRunCanCancelV2,
  type AgentRunV2,
  type AgentRunV2Repository,
} from "@voidmix/core";

import type { ProjectApplication } from "./index.js";

export interface AgentRunApplication {
  create(input: {
    actorId: string;
    projectId: string;
    assetVersionId?: string | null;
    input: Record<string, unknown>;
  }): Promise<AgentRunV2>;
  get(input: { actorId: string; runId: string }): Promise<AgentRunV2>;
  cancel(input: { actorId: string; runId: string }): Promise<AgentRunV2>;
  retry(input: { actorId: string; runId: string }): Promise<AgentRunV2>;
}

export function createAgentRunApplication(options: {
  projects: ProjectApplication;
  runs: AgentRunV2Repository;
  now?: () => Date;
  id?: () => string;
}): AgentRunApplication {
  const now = options.now ?? (() => new Date());
  const id = options.id ?? (() => `agent-run-${now().getTime()}`);

  return {
    async create({ actorId, projectId, assetVersionId, input }) {
      await options.projects.assertCapability({ actorId, projectId, capability: "project.write" });
      return options.runs.create({
        id: id(),
        projectId,
        requestedByUserId: actorId,
        assetVersionId: assetVersionId ?? null,
        attempt: 1,
        input,
        now: now(),
      });
    },

    async get({ actorId, runId }) {
      const run = await options.runs.getById(runId);
      if (!run) throw new AgentRunV2DomainError("AGENT_RUN_INVALID_INPUT", "Agent run not found.");
      await options.projects.assertCapability({
        actorId,
        projectId: run.projectId,
        capability: "project.read",
      });
      return run;
    },

    async cancel({ actorId, runId }) {
      const run = await this.get({ actorId, runId });
      assertAgentRunCanCancelV2(run.status);
      const updated = await options.runs.updateStatus({
        id: run.id,
        status: "cancelled",
        now: now(),
      });
      if (!updated)
        throw new AgentRunV2DomainError("AGENT_RUN_INVALID_INPUT", "Agent run not found.");
      return updated;
    },

    async retry({ actorId, runId }) {
      const run = await this.get({ actorId, runId });
      if (run.status !== "failed" && run.status !== "cancelled") {
        throw new AgentRunV2DomainError(
          "AGENT_RUN_TERMINAL",
          "Only failed or cancelled runs can retry.",
        );
      }
      await options.projects.assertCapability({
        actorId,
        projectId: run.projectId,
        capability: "project.write",
      });
      return options.runs.create({
        id: id(),
        projectId: run.projectId,
        requestedByUserId: actorId,
        assetVersionId: run.assetVersionId,
        attempt: run.attempt + 1,
        input: run.input,
        now: now(),
      });
    },
  };
}

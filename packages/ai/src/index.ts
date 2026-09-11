import type { Project, ProjectTask, ProjectRepository } from "@voidmix/core";

export type AiRunEvent =
  | { type: "text_delta"; text: string }
  | { type: "thinking"; active: boolean }
  | { type: "tool_call"; callId: string; name: string; input: unknown }
  | { type: "tool_result"; callId: string; name: string; output: unknown }
  | { type: "completed"; text: string }
  | { type: "failed"; message: string }
  | { type: "cancelled" };

export interface AiSession {
  id: string;
  providerSessionId: string;
  projectId?: string;
  cwd?: string;
  roleId?: string;
  roleInstructions?: string;
}

export interface AiRunInput {
  session: AiSession;
  project: Project;
  prompt: string;
  signal?: AbortSignal;
}

export interface AiToolRegistry {
  names(): string[];
  invoke(name: string, input: unknown): Promise<unknown>;
}

export interface AiSessionInput {
  projectId: string;
  title?: string;
  /** Project-local working directory. Caller must authorize access. */
  cwd?: string;
  role?: { id: string; instructions?: string };
  model?: { provider: string; id: string };
  thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
  /** Explicit Pi tool allowlist. Omitted means no tools. */
  tools?: string[];
}

export interface AiProvider {
  createSession(input: AiSessionInput): Promise<AiSession>;
  run(input: AiRunInput): AsyncIterable<AiRunEvent>;
  cancel(sessionId: string): Promise<void>;
  getSession(sessionId: string): Promise<AiSession | null>;
  disposeSession?(sessionId: string): Promise<void>;
  steer?(sessionId: string, prompt: string): Promise<void>;
}

export async function collectRun(provider: AiProvider, input: AiRunInput): Promise<AiRunEvent[]> {
  const events: AiRunEvent[] = [];
  for await (const event of provider.run(input)) events.push(event);
  return events;
}

export interface ProjectAgentToolDependencies {
  projects: ProjectRepository;
  actorId: string;
}

export function createProjectAgentTools(
  dependencies: ProjectAgentToolDependencies,
): AiToolRegistry {
  const tools = {
    get_project: async (input: unknown) => {
      const projectId = readString(input, "projectId");
      return dependencies.projects.getById(projectId);
    },
    list_tasks: async (input: unknown) => {
      const projectId = readString(input, "projectId");
      return dependencies.projects.listTasks(projectId);
    },
    create_task: async (input: unknown) => {
      const projectId = readString(input, "projectId");
      const title = readString(input, "title");
      return dependencies.projects.createTask({ projectId, title, actorId: dependencies.actorId });
    },
    update_task: async (input: unknown) => {
      const taskId = readString(input, "taskId");
      const status = readString(input, "status") as ProjectTask["status"];
      return dependencies.projects.updateTask({ taskId, status, actorId: dependencies.actorId });
    },
  } satisfies Record<string, (input: unknown) => Promise<unknown>>;

  return {
    names: () => Object.keys(tools),
    invoke: async (name, input) => {
      const tool = tools[name as keyof typeof tools];
      if (!tool) throw new Error(`Unknown AI tool: ${name}`);
      return tool(input);
    },
  };
}

export function createFakeProvider(tools?: AiToolRegistry): AiProvider {
  const sessions = new Map<string, AiSession>();
  return {
    async createSession(input) {
      const session = {
        id: `pis_${crypto.randomUUID()}`,
        providerSessionId: `fake_${crypto.randomUUID()}`,
        projectId: input.projectId,
      };
      sessions.set(session.id, session);
      return session;
    },
    async *run(input) {
      if (input.signal?.aborted) {
        yield { type: "cancelled" };
        return;
      }
      yield { type: "thinking", active: true };
      yield { type: "text_delta", text: `Prepared next steps for ${input.project.name}.` };
      if (tools)
        yield { type: "tool_result", callId: "fake", name: "list_tasks", output: tools.names() };
      yield { type: "thinking", active: false };
      yield { type: "completed", text: `Prepared next steps for ${input.project.name}.` };
    },
    async cancel(sessionId) {
      sessions.delete(sessionId);
    },
    async getSession(sessionId) {
      return sessions.get(sessionId) ?? null;
    },
  };
}

export function createPiProvider(options: { cwd?: string; agentDir?: string } = {}): AiProvider {
  const sessions = new Map<
    string,
    {
      session: {
        prompt: (prompt: string) => Promise<void>;
        subscribe: (listener: (event: unknown) => void) => () => void;
        dispose: () => void;
        abort: () => Promise<void>;
        steer: (prompt: string, images?: any[]) => Promise<void>;
        sessionId: string;
      };
      provider: AiSession;
    }
  >();

  return {
    async createSession(input) {
      const sdk = await import("@earendil-works/pi-coding-agent");
      const modelRuntime = await sdk.ModelRuntime.create({ allowModelNetwork: false });
      const selectedModel = input.model
        ? modelRuntime.getModel(input.model.provider, input.model.id)
        : undefined;
      if (input.model && !selectedModel)
        throw new Error(`Pi model not found: ${input.model.provider}/${input.model.id}`);
      const result = await sdk.createAgentSession({
        ...(selectedModel ? { model: selectedModel } : {}),
        ...((input.cwd ?? options.cwd) ? { cwd: input.cwd ?? options.cwd } : {}),
        ...(options.agentDir ? { agentDir: options.agentDir } : {}),
        ...(input.tools && input.tools.length > 0
          ? { tools: input.tools }
          : { noTools: "all" as const }),
        ...(input.thinkingLevel ? { thinkingLevel: input.thinkingLevel } : {}),
      });
      const provider = {
        id: `pis_${crypto.randomUUID()}`,
        providerSessionId: result.session.sessionId,
        projectId: input.projectId,
        ...(input.cwd ? { cwd: input.cwd } : {}),
        ...(input.role?.id ? { roleId: input.role.id } : {}),
        ...(input.role?.instructions ? { roleInstructions: input.role.instructions } : {}),
      };
      sessions.set(provider.id, { session: result.session, provider });
      return provider;
    },
    async *run(input) {
      const stored = sessions.get(input.session.id);
      if (!stored) {
        yield { type: "failed", message: "AI session not found." };
        return;
      }
      const events: AiRunEvent[] = [];
      let resolve: (() => void) | undefined;
      const pending = new Promise<void>((done) => {
        resolve = done;
      });
      const unsubscribe = stored.session.subscribe((event) => {
        const normalized = normalizePiEvent(event);
        if (normalized) events.push(normalized);
        if (isTerminalPiEvent(event)) resolve?.();
      });
      const rolePrefix = stored.provider.roleId
        ? `[Agent role: ${stored.provider.roleId}]${stored.provider.roleInstructions ? `\n${stored.provider.roleInstructions}` : ""}\n`
        : "";
      const prompt = stored.session.prompt(rolePrefix + input.prompt).catch((error: unknown) => {
        events.push({
          type: "failed",
          message: error instanceof Error ? error.message : "AI run failed.",
        });
        resolve?.();
      });
      while (
        events.length === 0 ||
        !events.some(
          (event) =>
            event.type === "completed" || event.type === "failed" || event.type === "cancelled",
        )
      ) {
        if (input.signal?.aborted) {
          await this.cancel(input.session.id);
          yield { type: "cancelled" };
          unsubscribe();
          return;
        }
        await Promise.race([pending, new Promise((done) => setTimeout(done, 20))]);
        while (events.length > 0) yield events.shift()!;
      }
      await prompt;
      unsubscribe();
      while (events.length > 0) yield events.shift()!;
    },
    async cancel(sessionId) {
      const stored = sessions.get(sessionId);
      if (stored) await stored.session.abort();
    },
    async disposeSession(sessionId) {
      sessions.get(sessionId)?.session.dispose();
      sessions.delete(sessionId);
    },
    async steer(sessionId, prompt) {
      const stored = sessions.get(sessionId);
      if (!stored) throw new Error("AI session not found.");
      await stored.session.steer(prompt);
    },
    async getSession(sessionId) {
      return sessions.get(sessionId)?.provider ?? null;
    },
  };
}

function normalizePiEvent(event: unknown): AiRunEvent | null {
  if (typeof event !== "object" || event === null || !("type" in event)) return null;
  const value = event as Record<string, unknown>;
  if (value.type === "message_update" && typeof value.assistantMessageEvent === "object") {
    const update = value.assistantMessageEvent as Record<string, unknown>;
    if (update.type === "text_delta" && typeof update.delta === "string")
      return { type: "text_delta", text: update.delta };
    if (update.type === "thinking_start") return { type: "thinking", active: true };
    if (update.type === "thinking_end") return { type: "thinking", active: false };
  }
  if (value.type === "agent_end") {
    const messages = Array.isArray(value.messages) ? value.messages : [];
    const text = messages
      .filter(
        (message): message is Record<string, unknown> =>
          typeof message === "object" && message !== null && message.role === "assistant",
      )
      .map((message) => (typeof message.content === "string" ? message.content : ""))
      .join("");
    return value.willRetry ? null : { type: "completed", text };
  }
  if (value.type === "agent_error") {
    return {
      type: "failed",
      message: typeof value.error === "string" ? value.error : "AI run failed.",
    };
  }
  if (value.type === "tool_execution_start" && typeof value.toolName === "string") {
    return {
      type: "tool_call",
      callId: typeof value.toolCallId === "string" ? value.toolCallId : crypto.randomUUID(),
      name: value.toolName,
      input: value.args ?? {},
    };
  }
  if (value.type === "tool_execution_end" && typeof value.toolName === "string") {
    return {
      type: "tool_result",
      callId: typeof value.toolCallId === "string" ? value.toolCallId : "unknown",
      name: value.toolName,
      output: value.result ?? value.error ?? null,
    };
  }
  return null;
}

function isTerminalPiEvent(event: unknown): boolean {
  return (
    typeof event === "object" &&
    event !== null &&
    "type" in event &&
    (event.type === "agent_end" || event.type === "agent_error")
  );
}

function readString(input: unknown, key: string): string {
  if (typeof input !== "object" || input === null || !(key in input)) {
    throw new Error(`Missing AI tool input: ${key}`);
  }
  const value = (input as Record<string, unknown>)[key];
  if (typeof value !== "string" || value.length === 0)
    throw new Error(`Invalid AI tool input: ${key}`);
  return value;
}

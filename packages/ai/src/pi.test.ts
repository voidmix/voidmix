import { beforeEach, expect, it, vi } from "vite-plus/test";
import { collectRun, createPiProvider } from "./index.js";

const sdk = vi.hoisted(() => ({
  listener: (_event: unknown) => {},
  unsubscribe: vi.fn(),
  abort: vi.fn(async () => {}),
  prompt: vi.fn<(text: string) => Promise<void>>(),
}));
vi.mock("@earendil-works/pi-coding-agent", () => ({
  ModelRuntime: { create: async () => ({}) },
  createAgentSession: async () => ({
    session: {
      sessionId: "pi-1",
      prompt: sdk.prompt,
      abort: sdk.abort,
      subscribe: (listener: typeof sdk.listener) => {
        sdk.listener = listener;
        return sdk.unsubscribe;
      },
    },
  }),
}));
beforeEach(() => vi.clearAllMocks());

async function setup(signal?: AbortSignal) {
  const provider = createPiProvider();
  const session = await provider.createSession({
    projectId: "p1",
    role: { id: "editor", instructions: "Review" },
  });
  return {
    provider,
    input: {
      session,
      project: { id: "p1", title: "Film" },
      prompt: "Go",
      ...(signal ? { signal } : {}),
    },
  };
}

it("drains retry events and completes when the prompt settles", async () => {
  sdk.prompt.mockImplementation(async () => {
    sdk.listener({ type: "message_update", assistantMessageEvent: null });
    sdk.listener({ type: "agent_end", willRetry: true });
    sdk.listener({
      type: "message_update",
      assistantMessageEvent: { type: "text_delta", delta: "Hello" },
    });
    sdk.listener({ type: "agent_end", messages: [{ role: "assistant", content: "Hello" }] });
  });
  const { provider, input } = await setup();
  expect(await collectRun(provider, input)).toEqual([
    { type: "text_delta", text: "Hello" },
    { type: "completed", text: "Hello" },
  ]);
  expect(sdk.prompt).toHaveBeenCalledWith("[Agent role: editor]\nReview\nGo");
  expect(sdk.unsubscribe).toHaveBeenCalledOnce();
});
it("delivers prompt failures and releases the subscription", async () => {
  sdk.prompt.mockRejectedValueOnce(new Error("failed"));
  const { provider, input } = await setup();
  expect(await collectRun(provider, input)).toEqual([{ type: "failed", message: "failed" }]);
  expect(sdk.unsubscribe).toHaveBeenCalledOnce();
});
it.each([true, false])("cancels a run (already aborted: %s)", async (alreadyAborted) => {
  const controller = new AbortController();
  if (alreadyAborted) controller.abort();
  sdk.prompt.mockImplementation(async () => {
    controller.abort();
  });
  const { provider, input } = await setup(controller.signal);
  expect(await collectRun(provider, input)).toEqual([{ type: "cancelled" }]);
  expect(sdk.abort).toHaveBeenCalledOnce();
  expect(sdk.prompt).toHaveBeenCalledTimes(alreadyAborted ? 0 : 1);
  expect(sdk.unsubscribe).toHaveBeenCalledOnce();
});

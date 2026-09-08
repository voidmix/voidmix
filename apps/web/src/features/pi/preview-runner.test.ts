/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createProjectStudioPreviewAdapter } from "../projects/preview-adapter";
import { runPreview } from "./preview-runner";

beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("preview run lifecycle", () => {
  it("shows ordered steps and produces a project-scoped task", async () => {
    const source = createProjectStudioPreviewAdapter();
    const session = source.createSession("northstar", "Write the brief");
    const promise = runPreview(source, session, new AbortController().signal, 10);
    expect(source.getSnapshot().sessions[0]?.status).toBe("running");
    await vi.runAllTimersAsync();
    await promise;
    const result = source.getSnapshot().sessions[0]!;
    expect(result).toMatchObject({
      status: "completed",
      steps: ["understand", "context", "create"],
    });
    expect(source.getSnapshot().activity[0]).toMatchObject({
      projectId: "northstar",
      action: "completed",
      title: "Pi / Write the brief",
    });
    expect(source.getSnapshot().tasks.find((task) => task.id === result.taskId)).toMatchObject({
      projectId: "northstar",
      title: "Write the brief",
    });
  });
  it("cancels without producing a task", async () => {
    const source = createProjectStudioPreviewAdapter();
    const count = source.getSnapshot().tasks.length;
    const session = source.createSession("northstar", "Cancel me");
    const controller = new AbortController();
    const promise = runPreview(source, session, controller.signal, 10);
    await vi.advanceTimersByTimeAsync(10);
    controller.abort();
    await promise;
    expect(source.getSnapshot().sessions[0]?.status).toBe("cancelled");
    expect(source.getSnapshot().tasks).toHaveLength(count);
    await vi.runAllTimersAsync();
    expect(source.getSnapshot().tasks).toHaveLength(count);
  });
  it("exposes failure and permits retry without duplicate tasks", async () => {
    const source = createProjectStudioPreviewAdapter();
    const session = source.createSession("northstar", "Retry me");
    const create = vi.spyOn(source, "createTask").mockImplementationOnce(() => {
      throw new Error("Unavailable");
    });
    const first = runPreview(source, session, new AbortController().signal, 10);
    await vi.runAllTimersAsync();
    await first;
    expect(source.getSnapshot().sessions[0]?.status).toBe("failed");
    const second = runPreview(
      source,
      source.getSnapshot().sessions[0]!,
      new AbortController().signal,
      10,
    );
    await vi.runAllTimersAsync();
    await second;
    expect(source.getSnapshot().sessions[0]?.status).toBe("completed");
    expect(create).toHaveBeenCalledTimes(2);
    expect(source.getSnapshot().tasks.filter((task) => task.title === "Retry me")).toHaveLength(1);
  });
});

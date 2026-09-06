import { describe, expect, it } from "vite-plus/test";

import { collectRun, createFakeProvider } from "./index.js";

describe("AI provider boundary", () => {
  it("normalizes a run into stable Voidmix events", async () => {
    const provider = createFakeProvider();
    const session = await provider.createSession({ projectId: "project-1" });
    const events = await collectRun(provider, {
      session,
      project: {
        id: "project-1",
        name: "Northstar",
        description: "Launch",
        status: "active",
        ownerId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      prompt: "Prepare next steps",
    });
    expect(events.map((event) => event.type)).toEqual([
      "thinking",
      "text_delta",
      "thinking",
      "completed",
    ]);
  });
});

import { describe, expect, it } from "vite-plus/test";

import { createPreviewResponse, initialChatMessages } from "./fixtures";

describe("chat fixtures", () => {
  it("starts without seeded conversation content", () => {
    expect(initialChatMessages).toEqual([]);
  });

  it("creates a deterministic Northstar preview response", () => {
    const first = createPreviewResponse("What changed today?");
    const second = createPreviewResponse("What changed today?");

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      role: "assistant",
      contentKey: "previewResponse",
      timestamp: { createdAt: "2026-09-06T08:00:00.000Z", kind: "preview" },
    });
    expect(first.content).toContain("Northstar sample workspace");
  });

  it("keeps implementation terminology out of preview responses", () => {
    const content = createPreviewResponse("What is blocked?").content.toLowerCase();

    expect(content).not.toContain("contract");
    expect(content).not.toContain("fixture");
    expect(content).not.toContain("api");
  });

  it("does not replace an explicitly supplied response with the localized fixture key", () => {
    const response = createPreviewResponse("Prompt", "Custom response");

    expect(response).toMatchObject({ content: "Custom response" });
    expect(response).not.toHaveProperty("contentKey");
  });
});

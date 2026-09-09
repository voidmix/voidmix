/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import {
  createLocalChatSession,
  localChatStorageKey,
  readLocalChatSession,
  updateLocalChatSession,
} from "./local-chat-store";

const messages = [
  {
    id: "user-0",
    role: "user" as const,
    content: "Start the brief",
    timestamp: { createdAt: "2026-09-06T08:00:00.000Z", kind: "now" as const },
  },
];

beforeEach(() => window.sessionStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("local chat store", () => {
  it("creates, reads, and updates a versioned session", () => {
    const chatId = createLocalChatSession(messages);

    expect(chatId).toMatch(/[\w-]+/);
    expect(window.sessionStorage.getItem(localChatStorageKey())).toContain(chatId);
    expect(readLocalChatSession(chatId)?.messages).toEqual(messages);

    const nextMessages = [
      ...messages,
      {
        id: "assistant-0",
        role: "assistant" as const,
        content: "Preview",
        timestamp: { createdAt: "2026-09-06T08:01:00.000Z", kind: "preview" as const },
      },
    ];
    updateLocalChatSession(chatId, nextMessages);

    expect(readLocalChatSession(chatId)?.messages).toEqual(nextMessages);
  });

  it("ignores malformed records without throwing", () => {
    window.sessionStorage.setItem(
      localChatStorageKey(),
      JSON.stringify({ broken: { id: "broken", messages: "not-an-array" } }),
    );

    expect(readLocalChatSession("broken")).toBeNull();
  });

  it("does not resurrect a session after its browser data is corrupted", () => {
    const chatId = createLocalChatSession(messages);
    window.sessionStorage.setItem(localChatStorageKey(), "not-json");

    expect(readLocalChatSession(chatId)).toBeNull();
  });

  it("round-trips supported content metadata and rejects unknown keys", () => {
    const assistant = {
      id: "assistant-0",
      role: "assistant" as const,
      content: "English fallback",
      contentKey: "previewResponse" as const,
      contentValues: { reviewerCount: 3 },
      timestamp: { createdAt: "2026-09-06T08:01:00.000Z", kind: "preview" as const },
    };
    const chatId = createLocalChatSession([...messages, assistant]);

    expect(readLocalChatSession(chatId)?.messages[1]).toEqual(assistant);

    window.sessionStorage.setItem(
      localChatStorageKey(),
      JSON.stringify({
        invalid: {
          id: "invalid",
          messages: [{ ...assistant, contentKey: "unknown" }],
          createdAt: "2026-09-06T08:00:00.000Z",
          updatedAt: "2026-09-06T08:00:00.000Z",
        },
      }),
    );
    expect(readLocalChatSession("invalid")).toBeNull();
  });

  it("migrates v1 storage to locale-neutral metadata before removing it", () => {
    const legacy = {
      legacy: {
        id: "legacy",
        createdAt: "2026-09-06T08:00:00.000Z",
        updatedAt: "2026-09-06T08:01:00.000Z",
        messages: [
          { id: "user-0", role: "user", content: "Start", timestamp: "Now" },
          {
            id: "assistant-0",
            role: "assistant",
            content:
              "In the Northstar sample workspace, the final color pass remains the current blocker. Three reviewers are ready, and the sound mix is already in progress.",
            timestamp: "Preview",
          },
        ],
      },
    };
    window.sessionStorage.setItem("voidmix.previewChats.v1", JSON.stringify(legacy));

    expect(readLocalChatSession("legacy")).toMatchObject({
      id: "legacy",
      messages: [
        { timestamp: { kind: "now", createdAt: "2026-09-06T08:00:00.000Z" } },
        { contentKey: "previewResponse", timestamp: { kind: "preview" } },
      ],
    });
    expect(window.sessionStorage.getItem(localChatStorageKey())).toContain('"legacy"');
    expect(window.sessionStorage.getItem("voidmix.previewChats.v1")).toBeNull();
  });

  it("retains v1 storage when the migration write is unavailable", () => {
    const legacy = {
      legacy: {
        id: "legacy",
        createdAt: "2026-09-06T08:00:00.000Z",
        updatedAt: "2026-09-06T08:00:00.000Z",
        messages: [{ id: "user-0", role: "user", content: "Start", timestamp: "Now" }],
      },
    };
    window.sessionStorage.setItem("voidmix.previewChats.v1", JSON.stringify(legacy));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => undefined);

    expect(readLocalChatSession("legacy")).toMatchObject({ id: "legacy" });
    expect(window.sessionStorage.getItem("voidmix.previewChats.v1")).toBe(JSON.stringify(legacy));
    expect(window.sessionStorage.getItem(localChatStorageKey())).toBeNull();
  });
});

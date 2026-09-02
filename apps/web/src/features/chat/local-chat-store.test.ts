/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import {
  createLocalChatSession,
  localChatStorageKey,
  readLocalChatSession,
  updateLocalChatSession,
} from "./local-chat-store";

const messages = [
  { id: "user-0", role: "user" as const, content: "Start the brief", timestamp: "Now" },
];

beforeEach(() => window.sessionStorage.clear());
afterEach(() => window.sessionStorage.clear());

describe("local chat store", () => {
  it("creates, reads, and updates a versioned session", () => {
    const chatId = createLocalChatSession(messages);

    expect(chatId).toMatch(/[\w-]+/);
    expect(window.sessionStorage.getItem(localChatStorageKey())).toContain(chatId);
    expect(readLocalChatSession(chatId)?.messages).toEqual(messages);

    const nextMessages = [
      ...messages,
      { id: "assistant-0", role: "assistant" as const, content: "Preview", timestamp: "Preview" },
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
});

/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const i18n = vi.hoisted(() => ({
  locale: "en" as "en" | "zh",
  messages: {
    en: {
      assistantName: "Voidmix",
      conversation: "Conversation",
      now: "Now",
      preview: "Preview",
      previewResponse: "English preview response",
      you: "You",
    },
    zh: {
      assistantName: "Voidmix",
      conversation: "Conversation (zh)",
      now: "Now (zh)",
      preview: "Preview (zh)",
      previewResponse: "Chinese preview response",
      you: "You (zh)",
    },
  } as Record<"en" | "zh", Record<string, string>>,
}));

vi.mock("../../../i18n/client", () => ({
  useTranslations: () => (key: string) => i18n.messages[i18n.locale][key] ?? key,
  useFormatter: () => ({
    dateTime: (value: Date | number) => String(value),
  }),
}));

import { createPreviewResponse } from "../fixtures";
import { createLocalChatSession, readLocalChatSession } from "../local-chat-store";
import type { ChatMessage } from "../types";
import { MessageList } from "./message-list";

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  i18n.locale = "en";
});

describe("localized chat messages", () => {
  it("renders one persisted preview response in the active locale while retaining user text", () => {
    const userMessage: ChatMessage = {
      id: "user-0",
      role: "user",
      content: "Keep this prompt in its original language",
      timestamp: { createdAt: "2026-09-06T08:00:00.000Z", kind: "now" },
    };
    const chatId = createLocalChatSession([userMessage, createPreviewResponse("prompt")]);
    const storedMessages = readLocalChatSession(chatId)?.messages ?? [];
    const { rerender } = render(<MessageList messages={storedMessages} />);

    expect(screen.getByText("English preview response")).toBeVisible();
    expect(screen.getByText(userMessage.content)).toBeVisible();

    i18n.locale = "zh";
    rerender(<MessageList messages={readLocalChatSession(chatId)?.messages ?? []} />);

    expect(screen.getByText("Chinese preview response")).toBeVisible();
    expect(screen.getByText(userMessage.content)).toBeVisible();
    expect(screen.queryByText("English preview response")).not.toBeInTheDocument();
  });
});

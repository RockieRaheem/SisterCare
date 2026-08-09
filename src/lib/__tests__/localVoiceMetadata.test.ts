// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { loadLocalMessages, saveLocalMessage } from "../localChatStore";

describe("local spoken-message metadata", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
  });

  it("preserves the response language for accessible replay", () => {
    saveLocalMessage("conversation-voice", {
      id: "message-1",
      conversationId: "conversation-voice",
      sender: "ai",
      content: "Toli wekka.",
      timestamp: new Date("2026-08-09T10:00:00.000Z"),
      read: true,
      metadata: { language: "lug" },
    });

    expect(loadLocalMessages("conversation-voice")[0]).toMatchObject({
      content: "Toli wekka.",
      metadata: { language: "lug" },
    });
  });
});

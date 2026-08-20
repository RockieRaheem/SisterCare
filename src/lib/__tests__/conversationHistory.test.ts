// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import type { ChatConversation } from "@/types";
import {
  deleteLocalConversation,
  mergeConversationHistory,
  saveLocalConversation,
} from "../localChatStore";

const conversation = (
  id: string,
  overrides: Partial<ChatConversation> = {},
): ChatConversation => ({
  id,
  userId: "member-1",
  title: "Earlier conversation",
  type: "ai_support",
  status: "active",
  retentionMode: "account",
  lastMessage: "",
  messageCount: 0,
  createdAt: new Date("2026-08-01T08:00:00.000Z"),
  updatedAt: new Date("2026-08-01T08:00:00.000Z"),
  ...overrides,
});

describe("conversation history index", () => {
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

  it("shows server history even when no device cache exists", () => {
    const earlier = conversation("remote-1");
    expect(mergeConversationHistory("member-1", [earlier])).toEqual([earlier]);
  });

  it("keeps the freshest copy while merging server and device history", () => {
    saveLocalConversation(conversation("shared", {
      title: "Updated on this device",
      updatedAt: new Date("2026-08-03T08:00:00.000Z"),
    }));

    expect(mergeConversationHistory("member-1", [conversation("shared")])).toHaveLength(1);
    expect(mergeConversationHistory("member-1", [conversation("shared")])[0].title).toBe("Updated on this device");
  });

  it("does not resurrect a locally deleted conversation still awaiting server deletion", () => {
    const removed = conversation("removed");
    saveLocalConversation(removed);
    deleteLocalConversation(removed.id);
    expect(mergeConversationHistory("member-1", [removed])).toEqual([]);
  });
});

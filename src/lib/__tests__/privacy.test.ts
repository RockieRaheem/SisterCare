import { describe, expect, it } from "vitest";
import { isPrivateStorageKey } from "@/lib/privacy";

describe("private client storage classification", () => {
  it.each([
    "sistercare-conversations",
    "sistercare-messages-conversation-1",
    "sistercare-chat-draft-conversation-1",
    "sistercare-pinned-user-1",
    "sistercare-notifications-user-1",
    "sistercare_tts_cache_metadata",
    "sc_dismissed_period_banner",
  ])("marks %s as private", (key) => {
    expect(isPrivateStorageKey(key)).toBe(true);
  });

  it.each(["sistercare-theme", "sistercare-language", "unrelated"])(
    "preserves non-sensitive preference %s",
    (key) => {
      expect(isPrivateStorageKey(key)).toBe(false);
    },
  );
});


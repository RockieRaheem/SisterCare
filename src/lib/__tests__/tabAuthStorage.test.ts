import { describe, expect, it } from "vitest";
import {
  getLegacySupabaseStorageKey,
  getOrCreateTabId,
  getTabAuthStorageKey,
  migrateLegacyAuthSession,
} from "../tabAuthStorage";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

describe("tab-scoped authentication storage", () => {
  it("keeps a stable id in one tab and different ids between tabs", () => {
    const first = { name: "" };
    const second = { name: "" };
    expect(getOrCreateTabId(first, () => "first")).toBe("first");
    expect(getOrCreateTabId(first, () => "replacement")).toBe("first");
    expect(getOrCreateTabId(second, () => "second")).toBe("second");
    expect(getTabAuthStorageKey("first")).not.toBe(
      getTabAuthStorageKey("second"),
    );
  });

  it("moves the previous shared session into only the active tab", () => {
    const legacyKey = "sb-project-auth-token";
    const local = memoryStorage({ [legacyKey]: "session-json" });
    const tab = memoryStorage();

    expect(
      migrateLegacyAuthSession(local, tab, legacyKey, "new-tab-key"),
    ).toBe(true);
    expect(tab.getItem("new-tab-key")).toBe("session-json");
    expect(local.getItem(legacyKey)).toBeNull();
    expect(
      migrateLegacyAuthSession(local, tab, legacyKey, "new-tab-key"),
    ).toBe(false);
  });

  it("derives the legacy Supabase key without exposing credentials", () => {
    expect(
      getLegacySupabaseStorageKey("https://project-ref.supabase.co"),
    ).toBe("sb-project-ref-auth-token");
    expect(getLegacySupabaseStorageKey("not a url")).toBeNull();
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const chat = readFileSync(path.join(process.cwd(), "src", "app", "chat", "page.tsx"), "utf8");
const bottomNav = readFileSync(path.join(process.cwd(), "src", "components", "layout", "BottomNav.tsx"), "utf8");

describe("member chat workspace", () => {
  it("owns the mobile viewport so the composer cannot sit behind global navigation", () => {
    expect(bottomNav).toContain('"/chat"');
    expect(chat).toContain("h-[100dvh]");
    expect(chat).not.toContain("h-[calc(100dvh-var(--bottom-nav-height)");
    expect(chat).toContain("fixed inset-y-0 left-0");
  });

  it("provides clear navigation without leaving the conversation stranded", () => {
    expect(chat).toContain("CHAT_WORKSPACE_NAVIGATION");
    expect(chat).toContain("Go to another SisterCare page");
    expect(chat).toContain("Talk to a counsellor");
    expect(chat).toContain("Open chat history and navigation");
    expect(chat).toContain("Private support");
  });
});

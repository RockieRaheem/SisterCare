import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (...segments: string[]) =>
  readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("mobile member navigation", () => {
  const navigation = read("src", "components", "layout", "BottomNav.tsx");
  const styles = read("src", "app", "globals.css");
  const root = read("src", "app", "layout.tsx");
  const sessions = read("src", "app", "sessions", "page.tsx");

  it("is fixed to the mobile visual viewport and respects device safe areas", () => {
    expect(navigation).toContain("member-bottom-nav");
    expect(styles).toContain(".member-bottom-nav");
    expect(styles).toContain("position: fixed !important");
    expect(styles).toContain("bottom: 0 !important");
    expect(styles).toContain("padding-bottom: var(--safe-area-inset-bottom)");
    expect(styles).toContain("min-height: var(--bottom-nav-height)");
    expect(styles).not.toContain("contain: layout paint");
  });

  it("reserves the fixed navigation area for the phone chat composer", () => {
    const chat = read("src", "app", "chat", "page.tsx");
    expect(styles).toContain(".member-chat-viewport");
    expect(styles).toContain("calc(var(--bottom-nav-height) + var(--safe-area-inset-bottom))");
    expect(chat).toContain("member-chat-viewport");
    expect(chat).toContain("member-chat-composer");
  });

  it("is mounted once by the root shell", () => {
    expect(root).toContain("<BottomNav />");
    expect(sessions).not.toContain("<BottomNav />");
    expect(sessions).not.toContain('from "@/components/layout/BottomNav"');
  });
});

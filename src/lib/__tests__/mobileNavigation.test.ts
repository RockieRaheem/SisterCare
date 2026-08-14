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
    expect(styles).toContain("padding-bottom: var(--safe-area-inset-bottom)");
    expect(styles).toContain("translate3d(0, 0, 0)");
  });

  it("is mounted once by the root shell", () => {
    expect(root).toContain("<BottomNav />");
    expect(sessions).not.toContain("<BottomNav />");
    expect(sessions).not.toContain('from "@/components/layout/BottomNav"');
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (...segments: string[]) =>
  readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("member counsellor discovery UI contracts", () => {
  const directory = read("src", "app", "counsellors", "page.tsx");
  const profile = read(
    "src",
    "app",
    "counsellors",
    "[counsellorId]",
    "page.tsx",
  );

  it("relies on the single global member navigation", () => {
    expect(directory).not.toContain("import BottomNav");
    expect(directory).not.toContain("<BottomNav");
    expect(profile).not.toContain("import BottomNav");
    expect(profile).not.toContain("<BottomNav");
  });

  it("uses mobile-safe search and filter control sizing", () => {
    expect(directory).toContain("text-base");
    expect(directory).toContain("min-h-12");
    expect(directory).not.toContain("xs:flex-row");
  });

  it("prevents narrow profile content from overflowing the viewport", () => {
    expect(directory).toContain("overflow-x-clip");
    expect(profile).toContain("overflow-x-clip");
    expect(profile).toContain("break-words");
  });

  it("keeps a prominent request action available on mobile", () => {
    expect(profile).toContain("Chat or call privately");
    expect(profile).toContain("fixed inset-x-3");
    expect(profile).toContain("RequestCounsellorButton");
  });

  it("does not report a missing counsellor while the profile is loading", () => {
    expect(profile).toContain('profileState === "loading"');
    expect(profile).toContain("CounsellorProfileSkeleton");
    expect(profile).toContain('profileState === "not_found"');
  });

  it("uses a high-contrast verified badge", () => {
    expect(profile).toMatch(/bg-primary[^"]*text-white/);
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (...segments: string[]) =>
  readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("member-facing data transparency", () => {
  it("shows the personal inputs behind dashboard cycle estimates", () => {
    const dashboard = source("src", "app", "dashboard", "page.tsx");
    expect(dashboard).toContain("How this estimate was calculated");
    expect(dashboard).toContain("planning estimate, not confirmation");
    expect(dashboard).toContain("profile.cycleData.lastPeriodDate");
    expect(dashboard).toContain("profile.cycleData.cycleLength");
    expect(dashboard).toContain("profile.cycleData.periodLength");
  });

  it("does not present population defaults as a member's personal pattern", () => {
    const profile = source("src", "app", "profile", "page.tsx");
    expect(profile).toContain("Your usual cycle length");
    expect(profile).toContain("Your usual period length");
    expect(profile).not.toContain("days (typical)");
  });

  it("explains counsellor ratings and hides an unverified session total", () => {
    const card = source("src", "components", "features", "CounsellorCard.tsx");
    const profile = source("src", "app", "counsellors", "[counsellorId]", "page.tsx");
    for (const view of [card, profile]) {
      expect(view).toContain("member reviews");
      expect(view).toContain("No member reviews yet");
      expect(view).not.toContain("sessionCount.toLocaleString");
    }
  });
});

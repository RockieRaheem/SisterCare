import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(
  path.join(process.cwd(), "src", "app", "analytics", "page.tsx"),
  "utf8",
);

describe("member Track experience", () => {
  it("uses private wellbeing check-ins as its primary source", () => {
    expect(page).toContain("getWellbeingCheckIns(user.uid)");
    expect(page).toContain("Your private timeline");
    expect(page).toContain("Your emotional timeline");
    expect(page).not.toContain("SummaryCard");
    expect(page).not.toContain("Mood 1–5");
    expect(page).not.toContain("Average stress");
  });

  it("keeps conclusions factual and non-diagnostic", () => {
    expect(page).toContain("does not score, diagnose, or explain your feelings for you");
    expect(page).not.toContain("Most often");
    expect(page).not.toContain("What stands out");
    expect(page).not.toContain("days checked in");
    expect(page).not.toContain("Agent Evaluation Metrics");
    expect(page).not.toContain("High-Risk Flags");
  });

  it("presents cycle tracking as secondary body context", () => {
    expect(page).toContain("Body context");
    expect(page).toContain("does not assume every emotional change is caused by menstruation");
    expect(page.indexOf("Your wellbeing")).toBeLessThan(page.indexOf("Body context"));
  });

  it("keeps private AI and verified human support immediately reachable", () => {
    expect(page).toContain('href="/chat"');
    expect(page).toContain('href="/counsellors"');
    expect(page).toContain("Human support");
  });
});

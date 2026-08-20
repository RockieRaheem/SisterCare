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
    expect(page).toContain("Remember what mattered—then choose what to do");
    expect(page).toContain("Your emotional timeline");
    expect(page).not.toContain("SummaryCard");
    expect(page).not.toContain("Mood 1–5");
    expect(page).not.toContain("Average stress");
  });

  it("keeps conclusions factual and non-diagnostic", () => {
    expect(page).toContain("Track does not grade your wellbeing or create a diagnosis");
    expect(page).not.toContain("Most often");
    expect(page).not.toContain("What stands out");
    expect(page).not.toContain("days checked in");
    expect(page).not.toContain("Agent Evaluation Metrics");
    expect(page).not.toContain("High-Risk Flags");
  });

  it("presents cycle tracking as secondary body context", () => {
    expect(page).toContain("Separate body record");
    expect(page).toContain("does not assume menstruation caused a feeling");
    expect(page.indexOf("What Track is for")).toBeLessThan(page.indexOf("Separate body record"));
  });

  it("keeps private AI and verified human support immediately reachable", () => {
    expect(page).toContain('href="/chat"');
    expect(page).toContain('href="/counsellors"');
    expect(page).toContain("Human support");
    expect(page).toContain("Talk about this");
    expect(page).toContain("Ask a counsellor");
  });

  it("makes the value of Track visible before showing records", () => {
    expect(page).toContain("Remember the context");
    expect(page).toContain("Prepare to talk");
    expect(page).toContain("Keep body context separate");
    expect(page).toContain("Choose what to look back at");
    expect(page).toContain("Changing this never deletes anything");
  });
});

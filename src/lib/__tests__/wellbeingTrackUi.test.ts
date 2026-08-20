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
    expect(page).toContain("These records are not a score or diagnosis");
    expect(page).not.toContain("Most often");
    expect(page).not.toContain("What stands out");
    expect(page).not.toContain("days checked in");
    expect(page).not.toContain("Agent Evaluation Metrics");
    expect(page).not.toContain("High-Risk Flags");
  });

  it("presents cycle tracking as secondary body context", () => {
    expect(page).toContain("Separate body record");
    expect(page).toContain("does not assume menstruation caused a feeling");
    expect(page.indexOf("Your emotional timeline")).toBeLessThan(page.indexOf("Separate body record"));
  });

  it("keeps private AI and verified human support immediately reachable", () => {
    expect(page).toContain('href="/chat"');
    expect(page).toContain('href="/counsellors"');
    expect(page).toContain("Human support");
    expect(page).toContain("Talk about this");
    expect(page).toContain("Ask a counsellor");
  });

  it("removes explanatory clutter and uses the pink and white theme", () => {
    expect(page).not.toContain("What Track is for");
    expect(page).not.toContain("Your records should help you take action");
    expect(page).not.toContain("Remember the context");
    expect(page).not.toContain("Prepare to talk");
    expect(page).not.toContain("Keep body context separate");
    expect(page).not.toContain('bg-[#241429]');
    expect(page).toContain("border-primary/20 bg-white");
    expect(page).toContain("Time range");
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const landingSource = readFileSync(
  join(projectRoot, "src/app/page.tsx"),
  "utf8",
);
const dashboardSource = readFileSync(
  join(projectRoot, "src/app/dashboard/page.tsx"),
  "utf8",
);

describe("landing positioning", () => {
  it("leads with general emotional support rather than a narrow life setting", () => {
    expect(landingSource).toContain(
      "Something happened and I feel hurt and overwhelmed.",
    );
    expect(landingSource).toMatch(/Share only\s+what feels safe\./);
    expect(landingSource.toLowerCase()).not.toContain("university");
  });

  it("keeps cycle tracking visible as a precise companion feature", () => {
    expect(landingSource).toContain("Next period estimate");
    expect(landingSource).toContain("2 days · 14 hours · 32 minutes");
  });
});

describe("dashboard cycle countdown", () => {
  it("continues calculating days, hours, and minutes from the prediction", () => {
    expect(dashboardSource).toContain(
      "Math.floor(diff / (1000 * 60 * 60 * 24))",
    );
    expect(dashboardSource).toContain(
      "Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))",
    );
    expect(dashboardSource).toContain(
      "Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))",
    );
  });
});

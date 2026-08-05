import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dashboardSource = readFileSync(
  path.join(process.cwd(), "src", "app", "dashboard", "page.tsx"),
  "utf8",
);

describe("dashboard support entry", () => {
  it("does not place the retired support banner above dashboard content", () => {
    expect(dashboardSource).not.toContain("PrivateSupportEntry");
    expect(dashboardSource).not.toContain("What feels difficult to say today?");
  });

  it("combines private chat and counsellor discovery in one support card", () => {
    expect(dashboardSource).toContain('aria-labelledby="dashboard-support-heading"');
    expect(dashboardSource).toContain('href="/chat"');
    expect(dashboardSource).toContain('href="/counsellors"');
    expect(dashboardSource).toContain("t.dashboard.chooseCounsellor");
  });
});

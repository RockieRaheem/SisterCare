import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.join(process.cwd(), "supabase", "migrations", "20260822_0029_safety_duty_ownership.sql"),
  "utf8",
);

describe("accountable safety duty migration", () => {
  it("requires a fresh administrator heartbeat", () => {
    expect(migration).toContain("safety_duty_roster");
    expect(migration).toContain("interval '3 minutes'");
    expect(migration).toContain("profile.role = 'admin'");
  });

  it("assigns incidents and reports to the current responder", () => {
    expect(migration).toContain("incidents_assign_safety_owner");
    expect(migration).toContain("reports_assign_safety_owner");
    expect(migration).toContain("new.assigned_to := public.current_safety_owner()");
  });

  it("backfills unowned active cases when duty begins", () => {
    expect(migration).toContain("where assigned_to is null and status in ('open', 'acknowledged')");
    expect(migration).toContain("where assigned_to is null and status in ('open', 'reviewing')");
  });
});

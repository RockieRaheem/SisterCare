import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.join(process.cwd(), "supabase", "migrations", "20260822_0032_care_outcomes_and_followups.sql"),
  "utf8",
);

describe("care outcomes and follow-up accountability", () => {
  it("measures useful support outcomes instead of activity alone", () => {
    expect(migration).toContain("felt_heard");
    expect(migration).toContain("next_step");
    expect(migration).toContain("follow_up_requested");
  });

  it("gives each follow-up a counsellor, due time, and lifecycle", () => {
    expect(migration).toContain("assigned_counsellor_id");
    expect(migration).toContain("due_at");
    expect(migration).toContain("'pending', 'contacted', 'completed'");
  });

  it("automatically follows up interrupted sessions", () => {
    expect(migration).toContain("create_interrupted_session_followup");
    expect(migration).toContain("'session_interrupted'");
  });
});

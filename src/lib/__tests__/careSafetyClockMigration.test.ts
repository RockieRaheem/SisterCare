import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260822_0028_realtime_care_safety_clock.sql",
  ),
  "utf8",
);

describe("database care safety clock", () => {
  it("runs independently every minute", () => {
    expect(migration).toContain("create extension if not exists pg_cron");
    expect(migration).toContain("'* * * * *'");
    expect(migration).toContain("public.run_care_safety_clock()");
  });

  it("enforces fallback, incident, rematch, and expiry deadlines", () => {
    expect(migration).toContain("interval '5 minutes'");
    expect(migration).toContain("interval '10 minutes'");
    expect(migration).toContain("interval '24 hours'");
    expect(migration).toContain("crisis_sla_breach");
    expect(migration).toContain("acceptance_timeout");
  });

  it("keeps the production maintenance heartbeat current", () => {
    expect(migration).toContain("'session_sweep'");
    expect(migration).toContain("'supabase_cron'");
  });
});

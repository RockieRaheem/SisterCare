import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (...segments: string[]) =>
  readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("daily wellbeing persistence contract", () => {
  const route = read("src", "app", "api", "wellbeing", "route.ts");
  const migration = read(
    "supabase",
    "migrations",
    "20260812_0023_daily_wellbeing_checkins.sql",
  );

  it("updates today's reflection instead of inserting another one", () => {
    expect(route).toContain('.eq("payload->>localDate", input.localDate)');
    expect(route).toContain('.order("updated_at", { ascending: false })');
    expect(route).toContain(".limit(1)");
    expect(route).toContain(".update({ payload: input })");
    expect(route).toContain("updated: true");
    expect(route).not.toContain('.eq("idempotency_key", idempotencyKey)');
  });

  it("enforces the invariant in Postgres during concurrent requests", () => {
    expect(migration).toContain("create unique index");
    expect(migration).toContain("user_id, record_type, ((payload ->> 'localDate'))");
    expect(migration).toContain("record_type = 'wellbeing'");
  });
});

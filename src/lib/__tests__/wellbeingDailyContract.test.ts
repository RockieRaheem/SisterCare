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
  const repairMigration = read(
    "supabase",
    "migrations",
    "20260820_0026_repair_wellbeing_storage.sql",
  );

  it("updates today's reflection instead of inserting another one", () => {
    expect(route).toContain('.eq("payload->>localDate", input.localDate)');
    expect(route).toContain('.order("updated_at", { ascending: false })');
    expect(route).toContain(".limit(1)");
    expect(route).toContain(".update({ payload: input })");
    expect(route).toContain("updated: true");
    expect(route).not.toContain('.eq("idempotency_key", idempotencyKey)');
  });

  it("uses the signed-in member token and Row Level Security instead of the admin client", () => {
    expect(route).toContain("database.auth.getUser(token)");
    expect(route).toContain("Authorization: `Bearer ${token}`");
    expect(route).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(route).not.toContain("getSupabaseAdmin");
  });

  it("enforces the invariant in Postgres during concurrent requests", () => {
    expect(migration).toContain("create unique index");
    expect(migration).toContain("user_id, record_type, ((payload ->> 'localDate'))");
    expect(migration).toContain("record_type = 'wellbeing'");
  });

  it("repairs older databases without weakening owner-only access", () => {
    expect(repairMigration).toContain("drop constraint if exists user_records_record_type_check");
    expect(repairMigration).toContain("'wellbeing'");
    expect(repairMigration).toContain("to authenticated");
    expect(repairMigration).toContain("using (user_id = auth.uid())");
    expect(repairMigration).toContain("with check (user_id = auth.uid())");
    expect(repairMigration).not.toContain("to anon");
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { describeCareNotification } from "../careNotification";

const migration = readFileSync(
  path.join(process.cwd(), "supabase", "migrations", "20260822_0030_durable_care_notifications.sql"),
  "utf8",
);

describe("durable private care notifications", () => {
  it("stores event references without copying message text", () => {
    expect(migration).toContain("create table if not exists public.care_notifications");
    expect(migration).not.toMatch(/care_notifications[\s\S]{0,500}\bmessage_text\b/);
    expect(migration).toContain("'message:' || new.id");
  });

  it("covers assignment, acceptance, rematching and messages", () => {
    for (const event of ["session_assigned", "session_accepted", "session_rematching", "session_message"]) {
      expect(migration).toContain(`'${event}'`);
    }
  });

  it("uses discreet notification copy", () => {
    const message = describeCareNotification("session_message");
    expect(message.message).not.toContain("health");
    expect(message.message).not.toContain("message text");
  });
});

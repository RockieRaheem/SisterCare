import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(path.join(process.cwd(), "supabase", "migrations", "20260824_0037_doctor_consultation_messaging.sql"), "utf8");

describe("private doctor consultation messaging", () => {
  it("stores messages in an RLS-protected server-only table", () => {
    expect(sql).toContain("create table public.doctor_messages");
    expect(sql).toContain("alter table public.doctor_messages enable row level security");
    expect(sql).toContain("revoke all on public.doctor_messages from anon, authenticated");
  });

  it("notifies without copying message text into notification metadata", () => {
    const notificationFunction = sql.split("create or replace function public.create_doctor_message_notification")[1];
    expect(notificationFunction).not.toContain("new.text");
    expect(notificationFunction).toContain("'doctor_message'");
  });
});

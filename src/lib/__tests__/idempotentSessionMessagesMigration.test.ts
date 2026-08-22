import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.join(process.cwd(), "supabase", "migrations", "20260822_0031_idempotent_session_messages.sql"),
  "utf8",
);

describe("idempotent private session messages", () => {
  it("deduplicates retries within the authenticated sender and session", () => {
    expect(migration).toContain("client_message_id uuid");
    expect(migration).toContain("(session_id, sender_id, client_message_id)");
    expect(migration).toContain("where client_message_id is not null");
  });
});

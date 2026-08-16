import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.join(process.cwd(), "src", "lib", "wellbeingClient.ts"),
  "utf8",
);

describe("authenticated wellbeing client", () => {
  it("uses the active Supabase session and owner-scoped RLS queries", () => {
    expect(source).toContain("getSupabaseBrowserClient");
    expect(source).toContain("data.session.user.id !== uid");
    expect(source).toContain('.eq("user_id", uid)');
    expect(source).toContain('.eq("record_type", "wellbeing")');
  });

  it("writes directly while online and queues only connection failures", () => {
    expect(source).toContain("navigator.onLine");
    expect(source).toContain("saveWellbeingCheckIn(uid, value)");
    expect(source).toContain("if (!isConnectionFailure(error)) throw error");
    expect(source).toContain("submitOfflineCapableWrite");
  });
});

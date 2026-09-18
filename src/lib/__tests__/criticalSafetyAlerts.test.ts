import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { describeCareNotification } from "@/lib/careNotification";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260824_0035_critical_safety_alerts.sql",
  ),
  "utf8",
);
const service = fs.readFileSync(
  path.join(process.cwd(), "src", "lib", "server", "safetyAlerts.ts"),
  "utf8",
);

describe("critical safety alerts", () => {
  it("adds a durable safety alert without changing browser table access", () => {
    expect(migration).toContain("'safety_alert'");
    expect(migration).not.toMatch(/grant\s+.*authenticated/i);
  });

  it("broadcasts only privacy-minimized metadata", () => {
    expect(service).toContain("severity: \"critical\"");
    expect(service).toContain("category: params.category");
    expect(service).not.toContain("member_summary");
    expect(service).not.toContain("message_text");
  });

  it("shows an unambiguous professional alert", () => {
    expect(describeCareNotification("safety_alert")).toEqual({
      title: "Critical safety alert",
      message:
        "A serious case needs immediate professional attention. Open the secure response workspace now.",
    });
  });
});

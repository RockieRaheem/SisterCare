import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const portal = fs.readFileSync(
  path.join(process.cwd(), "src", "app", "counsellor", "page.tsx"),
  "utf8",
);

describe("counsellor care-desk presence", () => {
  it("asks the server to go available on verified desk entry", () => {
    expect(portal).toContain('const effectiveStatus = await sendPresence(');
    expect(portal).toContain('? "available"');
    expect(portal).not.toContain('hasLiveAssignment ? "available" : "offline"');
  });

  it("does not open the counsellor care desk for administrators", () => {
    expect(portal).toContain('const isCounsellor = role === "counsellor"');
  });

  it("shows the server's reason when availability is rejected", () => {
    expect(portal).toContain('presenceError instanceof Error ? presenceError.message');
  });

  it("withdraws availability when in-app navigation leaves the care desk", () => {
    expect(portal).toContain('Client-side route changes do not emit beforeunload');
    expect(portal).toContain('void sendPresence("offline").catch(() => undefined)');
  });
});

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const portal = fs.readFileSync(
  path.join(process.cwd(), "src", "app", "counsellor", "page.tsx"),
  "utf8",
);

describe("counsellor care-desk presence", () => {
  it("asks the server to go available on verified desk entry", () => {
    expect(portal).toContain('const effectiveStatus = await sendPresence("available")');
    expect(portal).not.toContain('hasLiveAssignment ? "available" : "offline"');
  });

  it("does not open the counsellor care desk for administrators", () => {
    expect(portal).toContain('const isCounsellor = role === "counsellor"');
  });

  it("shows the server's reason when availability is rejected", () => {
    expect(portal).toContain('presenceError instanceof Error ? presenceError.message');
  });
});

import { describe, expect, it } from "vitest";
import { describeCanonicalHandoff } from "../handoffStatus";

describe("canonical counsellor handoff language", () => {
  it.each(["requested", "matched", "accepted"] as const)(
    "never claims a %s session is connected",
    (state) => {
      const result = describeCanonicalHandoff(state, "Dr Amina");
      expect(result.connected).toBe(false);
      expect(result.message.toLowerCase()).not.toContain("you are connected");
      expect(result.message).not.toContain("Dr Amina has accepted your request");
    },
  );

  it("only marks an active session as connected", () => {
    const result = describeCanonicalHandoff("active", "Dr Amina");
    expect(result.connected).toBe(true);
    expect(result.message).toContain("has accepted your request");
  });
});

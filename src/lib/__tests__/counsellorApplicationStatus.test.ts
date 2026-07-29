import { describe, expect, it } from "vitest";
import { resolveCounsellorPortalState } from "../counsellorApplicationStatus";

describe("counsellor portal state", () => {
  it("keeps submitted applicants in the review state", () => {
    expect(resolveCounsellorPortalState("member", "pending")).toBe("pending");
  });

  it("preserves review outcomes before a refreshed role becomes available", () => {
    expect(resolveCounsellorPortalState("member", "verified")).toBe("verified");
    expect(resolveCounsellorPortalState("member", "rejected")).toBe("rejected");
  });

  it("opens the workspace only for privileged roles", () => {
    expect(resolveCounsellorPortalState("counsellor", "verified")).toBe("workspace");
    expect(resolveCounsellorPortalState("admin", null)).toBe("workspace");
    expect(resolveCounsellorPortalState("member", null)).toBe("not_applied");
  });
});

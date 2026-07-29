import { describe, expect, it } from "vitest";
import { applyAdminVerificationOutcome } from "../adminAccess";

describe("admin access verification", () => {
  it("grants and removes access only after a conclusive result", () => {
    expect(applyAdminVerificationOutcome(null, "admin")).toBe(true);
    expect(applyAdminVerificationOutcome(true, "non_admin")).toBe(false);
  });

  it("preserves verified access through a temporary outage", () => {
    expect(applyAdminVerificationOutcome(true, "unavailable")).toBe(true);
  });

  it("does not grant access when initial verification is unavailable", () => {
    expect(applyAdminVerificationOutcome(null, "unavailable")).toBeNull();
    expect(applyAdminVerificationOutcome(false, "unavailable")).toBeNull();
  });
});

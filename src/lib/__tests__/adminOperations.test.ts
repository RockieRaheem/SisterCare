import { describe, expect, it } from "vitest";
import {
  hasRequiredPublicationAttestations,
  requiresCounsellorRestrictionReason,
} from "@/lib/adminOperations";

describe("admin publication controls", () => {
  it("requires every governed publication attestation", () => {
    expect(
      hasRequiredPublicationAttestations([
        "scope",
        "safety",
        "privacy",
        "clarity",
      ]),
    ).toBe(true);
    expect(
      hasRequiredPublicationAttestations(["scope", "safety", "privacy"]),
    ).toBe(false);
    expect(hasRequiredPublicationAttestations(null)).toBe(false);
  });
});

describe("counsellor restriction controls", () => {
  it("requires an accountable reason for a new suspension or expiry", () => {
    expect(requiresCounsellorRestrictionReason("verified", "suspended")).toBe(
      true,
    );
    expect(requiresCounsellorRestrictionReason("verified", "expired")).toBe(
      true,
    );
    expect(requiresCounsellorRestrictionReason("suspended", "suspended")).toBe(
      false,
    );
    expect(requiresCounsellorRestrictionReason("pending", "verified")).toBe(
      false,
    );
  });
});

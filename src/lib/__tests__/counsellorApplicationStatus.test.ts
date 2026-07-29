import { describe, expect, it } from "vitest";
import {
  resolveApplicationSubmissionStatus,
  resolveCounsellorPortalState,
} from "../counsellorApplicationStatus";

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

describe("counsellor application resubmission", () => {
  it("returns rejected applications to pending review", () => {
    expect(resolveApplicationSubmissionStatus("rejected")).toBe("pending");
  });

  it("supports first submissions and pending corrections", () => {
    expect(resolveApplicationSubmissionStatus(null)).toBe("pending");
    expect(resolveApplicationSubmissionStatus("pending")).toBe("pending");
  });

  it("prevents a verified counsellor from replacing KYC", () => {
    expect(() => resolveApplicationSubmissionStatus("verified")).toThrow(
      "already verified",
    );
  });
});

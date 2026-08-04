import { describe, expect, it } from "vitest";
import {
  resolveApplicationReviewAttempt,
  resolveApplicationSubmissionStatus,
  resolveCounsellorAccessRole,
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

describe("verified counsellor access recovery", () => {
  it("repairs a delayed profile role from two verified KYC records", () => {
    expect(
      resolveCounsellorAccessRole({
        profileRole: "member",
        applicationStatus: "verified",
        directoryVerificationStatus: "verified",
      }),
    ).toBe("counsellor");
  });

  it("keeps incomplete or rejected records outside the workspace", () => {
    expect(
      resolveCounsellorAccessRole({
        profileRole: "member",
        applicationStatus: "pending",
        directoryVerificationStatus: "verified",
      }),
    ).toBe("member");
    expect(
      resolveCounsellorAccessRole({
        profileRole: "member",
        applicationStatus: "verified",
        directoryVerificationStatus: "pending",
      }),
    ).toBe("member");
  });

  it("requires a verified directory even when a profile role is stale", () => {
    expect(
      resolveCounsellorAccessRole({
        profileRole: "counsellor",
        applicationStatus: "verified",
        directoryVerificationStatus: "suspended",
      }),
    ).toBe("member");
  });
});

describe("counsellor application review retries", () => {
  it("processes a pending application", () => {
    expect(resolveApplicationReviewAttempt("pending", "approve")).toBe("proceed");
    expect(resolveApplicationReviewAttempt("pending", "reject")).toBe("proceed");
  });

  it("accepts a repeated copy of a completed decision", () => {
    expect(resolveApplicationReviewAttempt("verified", "approve")).toBe(
      "already_applied",
    );
    expect(resolveApplicationReviewAttempt("rejected", "reject")).toBe(
      "already_applied",
    );
  });

  it("rejects a decision that contradicts the stored outcome", () => {
    expect(resolveApplicationReviewAttempt("verified", "reject")).toBe(
      "conflict",
    );
    expect(resolveApplicationReviewAttempt("rejected", "approve")).toBe(
      "conflict",
    );
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

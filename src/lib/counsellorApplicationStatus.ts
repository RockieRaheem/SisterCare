export type CounsellorApplicationStatus = "pending" | "verified" | "rejected";
export type CounsellorPortalState = "workspace" | "not_applied" | CounsellorApplicationStatus;
export type CounsellorReviewDecision = "approve" | "reject";
export type CounsellorReviewAttempt = "proceed" | "already_applied" | "conflict";

/** Resolve the professional workspace without confusing an applicant with an unauthorised member. */
export function resolveCounsellorPortalState(
  role: string | null,
  applicationStatus: CounsellorApplicationStatus | null,
): CounsellorPortalState {
  if (role === "counsellor" || role === "admin") return "workspace";
  return applicationStatus || "not_applied";
}

/** Rejected applications may be corrected; verified identities cannot reapply. */
export function resolveApplicationSubmissionStatus(
  currentStatus: CounsellorApplicationStatus | null,
): "pending" {
  if (currentStatus === "verified") {
    throw new Error("This account is already verified.");
  }
  return "pending";
}

/** Make review retries safe when the first request succeeded but its response was lost. */
export function resolveApplicationReviewAttempt(
  currentStatus: CounsellorApplicationStatus,
  decision: CounsellorReviewDecision,
): CounsellorReviewAttempt {
  if (currentStatus === "pending") return "proceed";
  if (
    (decision === "approve" && currentStatus === "verified") ||
    (decision === "reject" && currentStatus === "rejected")
  ) {
    return "already_applied";
  }
  return "conflict";
}

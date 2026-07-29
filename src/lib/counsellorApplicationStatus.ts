export type CounsellorApplicationStatus = "pending" | "verified" | "rejected";
export type CounsellorPortalState = "workspace" | "not_applied" | CounsellorApplicationStatus;

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

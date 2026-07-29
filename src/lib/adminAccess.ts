export type AdminVerificationOutcome = "admin" | "non_admin" | "unavailable";

/**
 * A temporary verification outage must not masquerade as a confirmed role
 * removal. Server API authorization remains authoritative for every operation.
 */
export function applyAdminVerificationOutcome(
  current: boolean | null,
  outcome: AdminVerificationOutcome,
): boolean | null {
  if (outcome === "admin") return true;
  if (outcome === "non_admin") return false;
  return current === true ? true : null;
}

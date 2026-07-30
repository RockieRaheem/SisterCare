export const PUBLICATION_ATTESTATIONS = [
  "scope",
  "safety",
  "privacy",
  "clarity",
] as const;

export function hasRequiredPublicationAttestations(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    PUBLICATION_ATTESTATIONS.every((item) => value.includes(item))
  );
}

export function requiresCounsellorRestrictionReason(
  previousStatus: string,
  nextStatus: string,
): boolean {
  return (
    previousStatus !== nextStatus &&
    ["suspended", "expired"].includes(nextStatus)
  );
}

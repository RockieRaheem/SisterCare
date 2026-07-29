export function resolveFirstAdminTarget(input: {
  authenticatedUid: string | null;
  requestedRole: string;
  administratorCount: number;
  bootstrapSecretMatches: boolean;
}): string | null {
  if (
    input.authenticatedUid &&
    input.requestedRole === "admin" &&
    input.administratorCount === 0 &&
    input.bootstrapSecretMatches
  ) {
    return input.authenticatedUid;
  }
  return null;
}

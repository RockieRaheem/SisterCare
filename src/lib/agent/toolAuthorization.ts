export function bindToolArgumentsToVerifiedUser(
  args: Record<string, unknown>,
  verifiedUserId?: string,
): Record<string, unknown> {
  return verifiedUserId ? { ...args, userId: verifiedUserId } : { ...args };
}

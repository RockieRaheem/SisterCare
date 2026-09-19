export function hasPrivacyTimeoutElapsed(
  lastActivityAt: number,
  timeoutMinutes: number,
  now = Date.now(),
): boolean {
  if (!Number.isFinite(lastActivityAt) || !Number.isFinite(timeoutMinutes)) return true;
  const safeMinutes = Math.min(60, Math.max(1, timeoutMinutes));
  return now - lastActivityAt >= safeMinutes * 60_000;
}

/** Other open SisterCare tabs can keep the same signed-in device active. */
export function mostRecentDeviceActivity(
  localActivityAt: number,
  sharedActivityAt: number,
  now = Date.now(),
): number {
  const sharedIsValid =
    Number.isFinite(sharedActivityAt) &&
    sharedActivityAt > 0 &&
    sharedActivityAt <= now + 5_000;
  return sharedIsValid
    ? Math.max(localActivityAt, sharedActivityAt)
    : localActivityAt;
}

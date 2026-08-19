export function hasPrivacyTimeoutElapsed(
  lastActivityAt: number,
  timeoutMinutes: number,
  now = Date.now(),
): boolean {
  if (!Number.isFinite(lastActivityAt) || !Number.isFinite(timeoutMinutes)) return true;
  const safeMinutes = Math.min(60, Math.max(1, timeoutMinutes));
  return now - lastActivityAt >= safeMinutes * 60_000;
}

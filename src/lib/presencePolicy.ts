export type LivePresence = "available" | "in_session" | "offline";

export function shouldMaintainPresence(
  presence: LivePresence,
  pageVisible: boolean,
  online: boolean,
): boolean {
  if (!online || presence === "offline") return false;
  return presence === "in_session" || pageVisible;
}

export function shouldWithdrawAvailability(
  presence: LivePresence,
  pageVisible: boolean,
): boolean {
  return presence === "available" && !pageVisible;
}

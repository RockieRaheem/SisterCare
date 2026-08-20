import {
  MemberAgeBand,
  UserPrivacyPreferences,
} from "@/types";

export const DEFAULT_PRIVACY_PREFERENCES: UserPrivacyPreferences = {
  conversationRetention: "account",
  counsellorContextSharing: "ask_each_time",
  discreetNotifications: true,
  notificationPreviews: false,
  sharedDeviceLockMinutes: 5,
  supportResponseStyle: "listen_first",
};

const AGE_BANDS = new Set<MemberAgeBand>([
  "under_13",
  "13_15",
  "16_17",
  "18_24",
  "25_plus",
  "prefer_not_to_say",
]);

export function normalizeMemberAgeBand(value: unknown): MemberAgeBand | null {
  return typeof value === "string" && AGE_BANDS.has(value as MemberAgeBand)
    ? (value as MemberAgeBand)
    : null;
}

export function normalizeSupportAlias(value: unknown): string {
  if (typeof value !== "string") return "SisterCare member";

  const alias = value.trim().replace(/\s+/g, " ").slice(0, 40);
  return alias.length >= 2 ? alias : "SisterCare member";
}

export function normalizePrivacyPreferences(
  value: unknown,
): UserPrivacyPreferences {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<UserPrivacyPreferences>)
      : {};
  const lockMinutes = Number(candidate.sharedDeviceLockMinutes);

  return {
    conversationRetention:
      candidate.conversationRetention === "session"
        ? "session"
        : "account",
    counsellorContextSharing:
      candidate.counsellorContextSharing === "approved_summary"
        ? "approved_summary"
        : candidate.counsellorContextSharing === "never"
          ? "never"
          : "ask_each_time",
    discreetNotifications:
      candidate.discreetNotifications !== false,
    notificationPreviews: candidate.notificationPreviews === true,
    sharedDeviceLockMinutes:
      Number.isFinite(lockMinutes) && lockMinutes >= 1 && lockMinutes <= 60
        ? Math.round(lockMinutes)
        : DEFAULT_PRIVACY_PREFERENCES.sharedDeviceLockMinutes,
    supportResponseStyle:
      candidate.supportResponseStyle === "gentle_steps" ||
      candidate.supportResponseStyle === "direct_options"
        ? candidate.supportResponseStyle
        : "listen_first",
  };
}

import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRIVACY_PREFERENCES,
  normalizeMemberAgeBand,
  normalizePrivacyPreferences,
  normalizeSupportAlias,
} from "../privacyPreferences";

describe("member privacy preferences", () => {
  it("uses discreet, consent-first defaults", () => {
    expect(normalizePrivacyPreferences(null)).toEqual(
      DEFAULT_PRIVACY_PREFERENCES,
    );
    expect(DEFAULT_PRIVACY_PREFERENCES.notificationPreviews).toBe(false);
    expect(
      DEFAULT_PRIVACY_PREFERENCES.counsellorContextSharing,
    ).toBe("ask_each_time");
  });

  it("normalizes supported choices and rejects unsafe values", () => {
    expect(
      normalizePrivacyPreferences({
        conversationRetention: "session",
        counsellorContextSharing: "never",
        discreetNotifications: false,
        notificationPreviews: true,
        sharedDeviceLockMinutes: 12.4,
      }),
    ).toEqual({
      conversationRetention: "session",
      counsellorContextSharing: "never",
      discreetNotifications: false,
      notificationPreviews: true,
      sharedDeviceLockMinutes: 12,
    });

    expect(
      normalizePrivacyPreferences({
        conversationRetention: "forever",
        counsellorContextSharing: "always",
        sharedDeviceLockMinutes: 0,
      }),
    ).toEqual(DEFAULT_PRIVACY_PREFERENCES);
  });

  it("normalizes aliases without exposing account identifiers", () => {
    expect(normalizeSupportAlias("  Quiet   River  ")).toBe("Quiet River");
    expect(normalizeSupportAlias("x")).toBe("SisterCare member");
    expect(normalizeSupportAlias(undefined)).toBe("SisterCare member");
  });

  it("accepts only defined age bands", () => {
    expect(normalizeMemberAgeBand("16_17")).toBe("16_17");
    expect(normalizeMemberAgeBand("17")).toBeNull();
    expect(normalizeMemberAgeBand(null)).toBeNull();
  });
});

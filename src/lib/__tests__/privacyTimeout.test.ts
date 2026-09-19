import { describe, expect, it } from "vitest";
import { hasPrivacyTimeoutElapsed, mostRecentDeviceActivity } from "../privacyTimeout";

describe("shared-device privacy timeout", () => {
  it("locks at the configured inactivity boundary", () => {
    const now = Date.parse("2026-08-19T12:15:00Z");
    expect(hasPrivacyTimeoutElapsed(now - 14 * 60_000, 15, now)).toBe(false);
    expect(hasPrivacyTimeoutElapsed(now - 15 * 60_000, 15, now)).toBe(true);
  });

  it("fails closed for invalid timing values", () => {
    expect(hasPrivacyTimeoutElapsed(Number.NaN, 5)).toBe(true);
    expect(hasPrivacyTimeoutElapsed(Date.now(), Number.NaN)).toBe(true);
  });

  it("keeps another active tab from timing out the same account", () => {
    const now = Date.parse("2026-09-19T12:00:00Z");
    const local = now - 6 * 60_000;
    const shared = now - 30_000;
    expect(hasPrivacyTimeoutElapsed(mostRecentDeviceActivity(local, shared, now), 5, now)).toBe(false);
    expect(mostRecentDeviceActivity(local, now + 60_000, now)).toBe(local);
  });
});

import { describe, expect, it } from "vitest";
import { hasPrivacyTimeoutElapsed } from "../privacyTimeout";

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
});

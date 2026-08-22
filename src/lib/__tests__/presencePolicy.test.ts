import { describe, expect, it } from "vitest";
import { shouldMaintainPresence, shouldWithdrawAvailability } from "../presencePolicy";

describe("truthful counsellor presence policy", () => {
  it("withdraws matching availability when the care desk is hidden", () => {
    expect(shouldWithdrawAvailability("available", false)).toBe(true);
    expect(shouldMaintainPresence("available", false, true)).toBe(false);
  });

  it("keeps an active care session present while the tab changes", () => {
    expect(shouldWithdrawAvailability("in_session", false)).toBe(false);
    expect(shouldMaintainPresence("in_session", false, true)).toBe(true);
  });

  it("never maintains a signal while offline", () => {
    expect(shouldMaintainPresence("available", true, false)).toBe(false);
  });
});

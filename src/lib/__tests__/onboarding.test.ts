import { describe, expect, it } from "vitest";
import {
  buildOnboardingProfileUpdate,
  periodReminderPayload,
} from "../onboarding";

const now = new Date("2026-07-30T10:00:00.000Z");

describe("onboarding persistence", () => {
  it("persists skip as a completed onboarding state", () => {
    expect(buildOnboardingProfileUpdate({ mode: "skip" }, now)).toEqual({
      onboarding_completed: true,
      updated_at: now.toISOString(),
    });
  });

  it("builds one complete profile update with cycle data", () => {
    const update = buildOnboardingProfileUpdate(
      {
        mode: "complete",
        displayName: "  Amina  ",
        lastPeriodDate: "2026-07-26",
        cycleLength: 28,
        periodLength: 5,
        reminderDays: 3,
      },
      now,
    );

    expect(update.onboarding_completed).toBe(true);
    expect(update.display_name).toBe("Amina");
    expect(update.cycle_data).toMatchObject({
      lastPeriodDate: "2026-07-26T00:00:00.000Z",
      cycleLength: 28,
      periodLength: 5,
      nextPeriodDate: "2026-08-23T00:00:00.000Z",
    });
  });

  it("rejects future dates and out-of-range cycle values", () => {
    expect(() =>
      buildOnboardingProfileUpdate(
        {
          mode: "complete",
          lastPeriodDate: "2026-08-01",
          cycleLength: 28,
          periodLength: 5,
          reminderDays: 3,
        },
        now,
      ),
    ).toThrow("cannot be in the future");
    expect(() =>
      buildOnboardingProfileUpdate(
        {
          mode: "complete",
          lastPeriodDate: "2026-07-26",
          cycleLength: 50,
          periodLength: 5,
          reminderDays: 3,
        },
        now,
      ),
    ).toThrow("between 21 and 40");
  });

  it("creates a deterministic reminder only while it is actionable", () => {
    expect(
      periodReminderPayload(
        "member-1",
        new Date("2026-08-23T00:00:00.000Z"),
        3,
        now,
      ),
    ).toMatchObject({
      userId: "member-1",
      type: "period_coming",
      scheduledFor: "2026-08-20T00:00:00.000Z",
      source: "onboarding",
    });
    expect(
      periodReminderPayload(
        "member-1",
        new Date("2026-07-31T00:00:00.000Z"),
        3,
        now,
      ),
    ).toBeNull();
  });
});

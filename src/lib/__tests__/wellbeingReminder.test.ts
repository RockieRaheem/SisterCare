import { describe, expect, it } from "vitest";
import {
  WELLBEING_REMINDER_HOUR,
  shouldSendWellbeingReminder,
} from "../wellbeingReminder";

describe("wellbeing reminder", () => {
  const evening = new Date(2026, 7, 13, WELLBEING_REMINDER_HOUR, 15);

  it("sends one gentle evening reminder when today has no pulse", () => {
    expect(
      shouldSendWellbeingReminder({
        now: evening,
        enabled: true,
        alreadyCheckedIn: false,
        lastReminderDate: null,
      }),
    ).toBe(true);
  });

  it("does not remind before evening, after check-in, when disabled, or twice", () => {
    const morning = new Date(2026, 7, 13, WELLBEING_REMINDER_HOUR - 1, 59);
    expect(shouldSendWellbeingReminder({ now: morning, enabled: true, alreadyCheckedIn: false, lastReminderDate: null })).toBe(false);
    expect(shouldSendWellbeingReminder({ now: evening, enabled: true, alreadyCheckedIn: true, lastReminderDate: null })).toBe(false);
    expect(shouldSendWellbeingReminder({ now: evening, enabled: false, alreadyCheckedIn: false, lastReminderDate: null })).toBe(false);
    expect(shouldSendWellbeingReminder({ now: evening, enabled: true, alreadyCheckedIn: false, lastReminderDate: "2026-08-13" })).toBe(false);
  });
});

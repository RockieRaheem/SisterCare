import { describe, it, expect } from "vitest";
import { calculateNextPeriod, getCycleInfo, getCurrentPhase } from "../cycle";

// Fixed reference dates so tests never depend on when they run.
const day = (iso: string) => new Date(`${iso}T12:00:00`);

describe("getCycleInfo — phase boundaries (28-day cycle, 5-day period)", () => {
  // floor(28 * 0.45) = 12, floor(28 * 0.55) = 15
  const lastPeriod = day("2026-01-01");
  const infoOnDay = (dayInCycle: number) => {
    const today = new Date(lastPeriod);
    today.setDate(today.getDate() + dayInCycle - 1);
    return getCycleInfo(lastPeriod, 28, 5, today);
  };

  it("day 1 is menstrual and in period", () => {
    const info = infoOnDay(1);
    expect(info.phase).toBe("menstrual");
    expect(info.dayInCycle).toBe(1);
    expect(info.isInPeriod).toBe(true);
  });

  it("last day of bleeding is still menstrual", () => {
    expect(infoOnDay(5).phase).toBe("menstrual");
    expect(infoOnDay(5).isInPeriod).toBe(true);
  });

  it("day after period ends is follicular", () => {
    expect(infoOnDay(6).phase).toBe("follicular");
    expect(infoOnDay(6).isInPeriod).toBe(false);
  });

  it("follicular runs through day 12, ovulation 13-15, luteal after", () => {
    expect(infoOnDay(12).phase).toBe("follicular");
    expect(infoOnDay(13).phase).toBe("ovulation");
    expect(infoOnDay(15).phase).toBe("ovulation");
    expect(infoOnDay(16).phase).toBe("luteal");
    expect(infoOnDay(28).phase).toBe("luteal");
  });

  it("counts down days until next period", () => {
    const info = infoOnDay(10);
    expect(info.daysUntilNextPeriod).toBe(19); // day 10 of 28 → 19 days left
    expect(info.nextPeriodDate.getDate()).toBe(29);
  });
});

describe("getCycleInfo — rolling forward unlogged cycles", () => {
  const lastPeriod = day("2026-01-01");

  it("exactly one cycle later is day 1 again and not yet late", () => {
    const info = getCycleInfo(lastPeriod, 28, 5, day("2026-01-29"));
    expect(info.dayInCycle).toBe(1);
    expect(info.phase).toBe("menstrual");
    expect(info.isPeriodLate).toBe(false);
    expect(info.daysLate).toBe(0);
  });

  it("two days past the expected period is late by 2 while predictions roll", () => {
    const info = getCycleInfo(lastPeriod, 28, 5, day("2026-01-31"));
    expect(info.dayInCycle).toBe(3);
    expect(info.isPeriodLate).toBe(true);
    expect(info.daysLate).toBe(2);
    // Next prediction rolled into the second cycle
    expect(info.nextPeriodDate.getMonth()).toBe(1); // February
    expect(info.nextPeriodDate.getDate()).toBe(26); // Jan 1 + 56 days
  });

  it("lateness keeps accumulating across multiple unlogged cycles", () => {
    const info = getCycleInfo(lastPeriod, 28, 5, day("2026-03-02"));
    expect(info.isPeriodLate).toBe(true);
    expect(info.daysLate).toBe(60 - 28); // 60 days since last period
  });
});

describe("calculateNextPeriod", () => {
  it("returns one cycle after the last period when within the cycle", () => {
    const next = calculateNextPeriod(day("2026-01-01"), 28, day("2026-01-10"));
    expect(next.getMonth()).toBe(0);
    expect(next.getDate()).toBe(29);
  });

  it("rolls forward past unlogged cycles to the next UPCOMING date", () => {
    const next = calculateNextPeriod(day("2026-01-01"), 28, day("2026-02-10"));
    // One full cycle passed (Jan 29), so next is Feb 26
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(26);
  });

  it("ignores time-of-day differences", () => {
    const a = calculateNextPeriod(
      new Date("2026-01-01T23:30:00"),
      28,
      new Date("2026-01-10T00:15:00"),
    );
    expect(a.getDate()).toBe(29);
  });
});

describe("getCurrentPhase", () => {
  it("mirrors getCycleInfo's phase fields", () => {
    const simplified = getCurrentPhase(new Date(), 28, 5);
    const full = getCycleInfo(new Date(), 28, 5);
    expect(simplified.phase).toBe(full.phase);
    expect(simplified.dayInCycle).toBe(full.dayInCycle);
    expect(simplified.daysUntilNextPeriod).toBe(full.daysUntilNextPeriod);
  });
});

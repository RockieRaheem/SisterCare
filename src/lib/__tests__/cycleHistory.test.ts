import { describe, expect, it } from "vitest";
import type { CycleData, CycleHistory } from "@/types";
import {
  completedCycleFromPeriodStart,
  mergeCycleHistory,
  observedCycleSummary,
} from "../cycleHistory";

const cycle = (lastPeriodDate: string): CycleData => ({
  lastPeriodDate: new Date(lastPeriodDate),
  cycleLength: 30,
  periodLength: 3,
  nextPeriodDate: new Date("2026-08-31T00:00:00.000Z"),
  currentPhase: "menstrual",
  symptoms: [],
  history: [],
});

describe("cycle history", () => {
  it("closes a cycle when a later period start is confirmed", () => {
    const result = completedCycleFromPeriodStart(
      cycle("2026-08-01T00:00:00.000Z"),
      new Date("2026-08-31T00:00:00.000Z"),
    );
    expect(result).toMatchObject({ cycleLength: 30, periodLength: 3 });
    expect(result?.endDate?.toISOString()).toBe("2026-08-30T00:00:00.000Z");
  });

  it("treats a nearby date as a correction instead of another cycle", () => {
    expect(completedCycleFromPeriodStart(
      cycle("2026-08-01T00:00:00.000Z"),
      new Date("2026-08-03T00:00:00.000Z"),
    )).toBeNull();
  });

  it("deduplicates legacy and durable history before calculating observations", () => {
    const completed = {
      id: "cycle-1",
      ...completedCycleFromPeriodStart(
        cycle("2026-08-01T00:00:00.000Z"),
        new Date("2026-08-31T00:00:00.000Z"),
      ),
    } as CycleHistory;
    const merged = mergeCycleHistory([completed], [{ ...completed, id: "legacy-1" }]);
    expect(merged).toHaveLength(1);
    expect(observedCycleSummary(merged)).toEqual({ count: 1, cycle: 30, period: 3 });
  });
});

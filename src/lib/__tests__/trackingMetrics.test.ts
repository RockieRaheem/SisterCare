import { describe, expect, it } from "vitest";
import { summarizeMemberTracking } from "@/lib/trackingMetrics";
import type { CycleData, CycleHistory, SymptomLog } from "@/types";

const cycle = (cycleLength: number, periodLength = 4): CycleData => ({
  lastPeriodDate: new Date("2026-07-01T00:00:00.000Z"),
  cycleLength,
  periodLength,
  nextPeriodDate: new Date("2026-08-03T00:00:00.000Z"),
  currentPhase: "follicular",
  symptoms: [],
  history: [],
});

const completedHistory: CycleHistory = {
  id: "cycle-1",
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  endDate: new Date("2026-06-27T00:00:00.000Z"),
  cycleLength: 27,
  periodLength: 5,
  symptoms: [],
  notes: "Confirmed cycle",
};

const symptom = (id: string, date: string): SymptomLog => ({
  id,
  date: new Date(date),
  mood: "okay",
  symptoms: ["cramps"],
  notes: "",
});

describe("member tracking metrics", () => {
  it("uses the current user's saved settings instead of a historical average", () => {
    const history = [completedHistory];

    expect(summarizeMemberTracking(cycle(33, 5), history, [])).toMatchObject({
      cycleLength: 33,
      periodLength: 5,
      completedCycles: 1,
    });
    expect(summarizeMemberTracking(cycle(29, 3), history, [])).toMatchObject({
      cycleLength: 29,
      periodLength: 3,
      completedCycles: 1,
    });
  });

  it("counts completed cycles from history and distinct symptom dates", () => {
    const result = summarizeMemberTracking(cycle(30), [completedHistory], [
      symptom("s-1", "2026-08-20T08:00:00.000Z"),
      symptom("s-2", "2026-08-20T18:00:00.000Z"),
      symptom("s-3", "2026-08-21T09:00:00.000Z"),
    ]);

    expect(result.completedCycles).toBe(1);
    expect(result.symptomDays).toBe(2);
  });

  it("returns empty personal metrics when cycle setup does not exist", () => {
    expect(summarizeMemberTracking(null, [], [])).toEqual({
      cycleLength: null,
      periodLength: null,
      completedCycles: 0,
      symptomDays: 0,
    });
  });
});

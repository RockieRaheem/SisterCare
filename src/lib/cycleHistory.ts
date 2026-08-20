import type { CycleData, CycleHistory } from "@/types";

const DAY_MS = 86_400_000;

const startOfUtcDay = (value: Date): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

export function completedCycleFromPeriodStart(
  previous: CycleData | null | undefined,
  nextPeriodStart: Date,
): Omit<CycleHistory, "id"> | null {
  if (!previous || Number.isNaN(nextPeriodStart.getTime())) return null;

  const previousStart = startOfUtcDay(new Date(previous.lastPeriodDate));
  const nextStart = startOfUtcDay(nextPeriodStart);
  const cycleLength = Math.round((nextStart.getTime() - previousStart.getTime()) / DAY_MS);

  // Dates within two weeks are treated as corrections to the current record,
  // not as a biologically implausible completed cycle.
  if (cycleLength < 14) return null;

  return {
    startDate: previousStart,
    endDate: new Date(nextStart.getTime() - DAY_MS),
    cycleLength,
    periodLength: previous.periodLength,
    symptoms: previous.symptoms || [],
    notes: "Recorded automatically from two confirmed period start dates.",
  };
}

export function mergeCycleHistory(
  stored: CycleHistory[],
  legacy: CycleHistory[],
): CycleHistory[] {
  const merged = new Map<string, CycleHistory>();
  [...stored, ...legacy].forEach((entry) => {
    const key = `${startOfUtcDay(new Date(entry.startDate)).toISOString()}:${entry.endDate ? startOfUtcDay(new Date(entry.endDate)).toISOString() : "open"}`;
    if (!merged.has(key)) merged.set(key, entry);
  });
  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );
}

export function observedCycleSummary(history: CycleHistory[]) {
  const completed = history.filter(
    (entry) => entry.endDate && Number.isFinite(entry.cycleLength) && entry.cycleLength >= 14,
  );
  const plausibleCycles = completed
    .map((entry) => entry.cycleLength)
    .filter((value) => value <= 90);
  const plausiblePeriods = completed
    .map((entry) => entry.periodLength)
    .filter((value) => value >= 1 && value <= 14);
  const average = (values: number[]) =>
    values.length
      ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
      : null;

  return {
    count: completed.length,
    cycle: average(plausibleCycles),
    period: average(plausiblePeriods),
  };
}

import type { CycleData, CycleHistory, SymptomLog } from "@/types";
import { mergeCycleHistory, observedCycleSummary } from "@/lib/cycleHistory";

const localDateKey = (value: Date): string => {
  const date = new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const validSetting = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;

export function summarizeMemberTracking(
  cycleData: CycleData | null | undefined,
  storedHistory: CycleHistory[],
  symptomsInRange: SymptomLog[],
) {
  const history = mergeCycleHistory(storedHistory, cycleData?.history || []);
  const completed = observedCycleSummary(history).count;
  const symptomDays = new Set(
    symptomsInRange
      .map((entry) => new Date(entry.date))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map(localDateKey),
  ).size;

  return {
    cycleLength: validSetting(cycleData?.cycleLength),
    periodLength: validSetting(cycleData?.periodLength),
    completedCycles: completed,
    symptomDays,
  };
}

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

export function groupSymptomRecordsByDay(symptoms: SymptomLog[]) {
  const days = new Map<
    string,
    {
      dateKey: string;
      date: Date;
      recordIds: string[];
      symptoms: Set<string>;
      sources: Set<"chat" | "manual">;
      hasUnknownSource: boolean;
    }
  >();

  symptoms.forEach((entry) => {
    const date = new Date(entry.date);
    if (Number.isNaN(date.getTime())) return;
    const dateKey = localDateKey(date);
    const existing = days.get(dateKey) || {
      dateKey,
      date,
      recordIds: [],
      symptoms: new Set<string>(),
      sources: new Set<"chat" | "manual">(),
      hasUnknownSource: false,
    };
    existing.recordIds.push(entry.id);
    (entry.symptoms || []).forEach((symptom) => {
      const label = symptom.trim();
      if (label) existing.symptoms.add(label);
    });
    if (entry.source) existing.sources.add(entry.source);
    else existing.hasUnknownSource = true;
    days.set(dateKey, existing);
  });

  return [...days.values()]
    .map((entry) => ({
      ...entry,
      symptoms: [...entry.symptoms],
      sources: [...entry.sources],
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function summarizeMemberTracking(
  cycleData: CycleData | null | undefined,
  storedHistory: CycleHistory[],
  symptomsInRange: SymptomLog[],
) {
  const history = mergeCycleHistory(storedHistory, cycleData?.history || []);
  const completed = observedCycleSummary(history).count;
  const symptomDays = groupSymptomRecordsByDay(symptomsInRange).length;

  return {
    cycleLength: validSetting(cycleData?.cycleLength),
    periodLength: validSetting(cycleData?.periodLength),
    completedCycles: completed,
    symptomDays,
  };
}

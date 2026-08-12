export interface WellbeingCheckInInput {
  mood: number;
  stress: number;
  sleep: number;
  energy: number;
  localDate?: string;
  feelings?: WellbeingFeeling[];
  contexts?: WellbeingContext[];
  supportNeed?: WellbeingSupportNeed;
  note?: string;
}

export const WELLBEING_FEELINGS = [
  "calm",
  "hopeful",
  "content",
  "tired",
  "anxious",
  "overwhelmed",
  "sad",
  "lonely",
  "angry",
  "numb",
] as const;

export const WELLBEING_CONTEXTS = [
  "relationships",
  "family",
  "work_or_study",
  "health_or_body",
  "grief_or_loss",
  "safety_or_harassment",
  "money",
  "sleep",
  "other",
] as const;

export const WELLBEING_SUPPORT_NEEDS = [
  "reflect",
  "coping_tools",
  "talk_to_someone",
  "urgent_support",
] as const;

export type WellbeingFeeling = (typeof WELLBEING_FEELINGS)[number];
export type WellbeingContext = (typeof WELLBEING_CONTEXTS)[number];
export type WellbeingSupportNeed = (typeof WELLBEING_SUPPORT_NEEDS)[number];

const score = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5
    ? parsed
    : null;
};

const selections = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  limit: number,
): T[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value.filter(
        (item): item is T =>
          typeof item === "string" && allowed.includes(item as T),
      ),
    ),
  ).slice(0, limit);
};

export function localWellbeingDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeWellbeingDate(
  value: unknown,
  now = new Date(),
): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return localWellbeingDate(now);
  }
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return localWellbeingDate(now);
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const candidateUtc = Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
  return Math.abs(candidateUtc - todayUtc) <= 86_400_000
    ? value
    : localWellbeingDate(now);
}

export function parseWellbeingCheckIn(
  value: unknown,
): WellbeingCheckInInput | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const mood = score(candidate.mood);
  const stress = score(candidate.stress);
  const sleep = score(candidate.sleep);
  const energy = score(candidate.energy);
  if (mood === null || stress === null || sleep === null || energy === null) {
    return null;
  }

  const note =
    typeof candidate.note === "string"
      ? candidate.note.trim().replace(/\s+/g, " ").slice(0, 500)
      : "";
  const feelings = selections(candidate.feelings, WELLBEING_FEELINGS, 3);
  const contexts = selections(candidate.contexts, WELLBEING_CONTEXTS, 3);
  const supportNeed = WELLBEING_SUPPORT_NEEDS.includes(
    candidate.supportNeed as WellbeingSupportNeed,
  )
    ? (candidate.supportNeed as WellbeingSupportNeed)
    : undefined;
  const localDate =
    typeof candidate.localDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(candidate.localDate)
      ? candidate.localDate
      : undefined;
  return {
    mood,
    stress,
    sleep,
    energy,
    ...(localDate ? { localDate } : {}),
    ...(feelings.length ? { feelings } : {}),
    ...(contexts.length ? { contexts } : {}),
    ...(supportNeed ? { supportNeed } : {}),
    ...(note ? { note } : {}),
  };
}

export interface WellbeingCheckInInput {
  mood: number;
  stress: number;
  sleep: number;
  energy: number;
  note?: string;
}

const score = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5
    ? parsed
    : null;
};

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
  return {
    mood,
    stress,
    sleep,
    energy,
    ...(note ? { note } : {}),
  };
}

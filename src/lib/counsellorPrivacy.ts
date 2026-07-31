const EMAIL_PATTERN =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN =
  /(?<!\w)(?:\+?\d[\s().-]*){7,15}(?!\w)/g;
const INTRODUCED_NAME_PATTERN =
  /\b(?:my name is|i am called|call me)\s+[\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*){0,3}/giu;

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function sanitizeCounsellorSummary(
  value: unknown,
  memberIdentityValues: Array<string | null | undefined> = [],
): string {
  const source =
    typeof value === "string" && value.trim()
      ? value
      : "Member requested a counselling session";

  let summary = source
    .replace(EMAIL_PATTERN, "[private email]")
    .replace(PHONE_PATTERN, "[private number]")
    .replace(INTRODUCED_NAME_PATTERN, "the member");

  for (const identity of memberIdentityValues) {
    const normalized = identity?.trim();
    if (!normalized || normalized.length < 3) continue;
    summary = summary.replace(
      new RegExp(escapeRegularExpression(normalized), "giu"),
      "the member",
    );
  }

  return summary
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

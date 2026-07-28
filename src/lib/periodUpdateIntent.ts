export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function daysBefore(now: Date, days: number): Date {
  const result = startOfDay(now);
  result.setDate(result.getDate() - days);
  return result;
}

function hasPeriodUpdateContext(history: ConversationTurn[]): boolean {
  return history.slice(-12).some((turn) =>
    /period update needed|update period date|last period|period started|period date/i.test(
      turn.content,
    ),
  );
}

export function isPeriodUpdateIntent(
  message: string,
  history: ConversationTurn[] = [],
): boolean {
  if (
    /\b(period|menstrual|menses)\b.*\b(started|start|came|began|occurred|update|last)\b|\b(update|last)\b.*\b(period|menstrual|menses)\b/i.test(
      message,
    )
  ) {
    return true;
  }

  return (
    hasPeriodUpdateContext(history) &&
    /\b(today|yesterday|last month|last week|\d+\s*(day|week)s?\s*(ago|back))\b/i.test(
      message,
    )
  );
}

/**
 * Parse only an explicit period-date statement. Contextual shorthand is
 * accepted solely after a period-update prompt, preventing unrelated dates
 * from silently changing health records.
 */
export function derivePeriodStartDate(
  message: string,
  history: ConversationTurn[] = [],
  now: Date = new Date(),
): Date | null {
  if (!isPeriodUpdateIntent(message, history)) return null;

  const normalized = message.toLowerCase();
  if (/\bday before yesterday\b/.test(normalized)) return daysBefore(now, 2);
  if (/\byesterday\b/.test(normalized)) return daysBefore(now, 1);
  if (/\btoday\b/.test(normalized)) return startOfDay(now);

  const relative = normalized.match(
    /\b(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s*(day|week)s?\s*(ago|back)\b/,
  );
  if (relative) {
    const count = NUMBER_WORDS[relative[1]] ?? Number(relative[1]);
    const days = relative[2] === "week" ? count * 7 : count;
    if (Number.isInteger(days) && days >= 0 && days <= 60) {
      return daysBefore(now, days);
    }
    return null;
  }

  if (/\blast week\b/.test(normalized)) return daysBefore(now, 7);

  const lastMonthDay = normalized.match(
    /\blast month(?:\s+on)?\s+(\d{1,2})(?:st|nd|rd|th)?\b/,
  );
  if (lastMonthDay) {
    const day = Number(lastMonthDay[1]);
    const candidate = startOfDay(now);
    candidate.setMonth(candidate.getMonth() - 1, 1);
    const daysInMonth = new Date(
      candidate.getFullYear(),
      candidate.getMonth() + 1,
      0,
    ).getDate();
    if (day >= 1 && day <= daysInMonth) {
      candidate.setDate(day);
      return candidate;
    }
    return null;
  }

  const isoDate = message.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoDate) {
    const candidate = startOfDay(new Date(`${isoDate[1]}T00:00:00`));
    if (!Number.isNaN(candidate.getTime()) && candidate <= startOfDay(now)) {
      return candidate;
    }
  }

  return null;
}

export type AppRoute =
  | "/dashboard"
  | "/library"
  | "/counsellors"
  | "/sessions"
  | "/profile"
  | "/settings";

export type ClientAction =
  | {
      type: "navigate";
      href: AppRoute;
      search?: string;
      articleId?: number;
    }
  | { type: "sign_out" };

export function inferClientAction(message: string): ClientAction | null {
  const normalized = message.toLowerCase();
  if (
    /\b(log\s+me\s+out|sign\s+me\s+out|logout\s+me|sign\s+out\s+now|log\s+out\s+now)\b/.test(
      normalized,
    )
  ) {
    return { type: "sign_out" };
  }

  if (
    /\b(food|foods|nutrition|diet|meal|meals|what\s+to\s+eat)\b/.test(
      normalized,
    ) &&
    /\b(article|articles|book|library|read|find|show)\b/.test(normalized)
  ) {
    return {
      type: "navigate",
      href: "/library",
      search: "foods",
      articleId: 6,
    };
  }

  if (!/\b(open|go to|take me|navigate|redirect|show me)\b/.test(normalized)) {
    return null;
  }

  const destinations: Array<[RegExp, AppRoute]> = [
    [/\b(library|health library|resources)\b/, "/library"],
    [/\b(sessions?|appointments?)\b/, "/sessions"],
    [/\b(counsellors?|human support|therapists?)\b/, "/counsellors"],
    [/\b(profile|my details)\b/, "/profile"],
    [/\b(settings?|preferences)\b/, "/settings"],
    [/\b(dashboard|home)\b/, "/dashboard"],
  ];
  for (const [pattern, href] of destinations) {
    if (pattern.test(normalized)) return { type: "navigate", href };
  }
  return null;
}

export function isConfirmedPregnancyIntent(message: string): boolean {
  return /\b(i(?:\s+am|'m)\s+(?:about\s+)?(?:\d+\s*(?:day|week|month)s?\s+)?pregnant|i\s+have\s+a\s+positive\s+pregnancy\s+test|pregnancy\s+test\s+is\s+positive|i\s+(?:checked|tested|confirmed)(?:\s+today)?\s+(?:and\s+)?(?:that\s+)?i(?:\s+am|'m)\s+pregnant|ndi\s+(?:o)?lubuto|nfunye\s+(?:o)?lubuto)\b/i.test(
    message,
  );
}

export function isPregnancyActivationRequest(message: string): boolean {
  return /\b(switch|set|update|change|move)\b[\s\S]{0,70}\b(pregnan(?:t|cy)|pregnancy\s+mode)\b|\bnot\s+(?:in|on)\s+(?:my\s+)?(?:period|menstruation)\b/i.test(
    message,
  );
}

export function hasPregnancyConfirmation(
  message: string,
  history: Array<{ role: string; content: string }>,
): boolean {
  if (isConfirmedPregnancyIntent(message)) return true;
  return history.some(
    (entry) =>
      entry.role === "user" && isConfirmedPregnancyIntent(entry.content),
  );
}

export function getPregnancyLmpFromMessages(
  messages: string[],
  now = new Date(),
): Date | null {
  for (const message of [...messages].reverse()) {
    const dateMatch = message.match(
      /\b(\d{1,2})[\/-](\d{1,2})[\/-]((?:19|20)\d{2})\b/,
    );
    if (dateMatch) {
      const day = Number(dateMatch[1]);
      const month = Number(dateMatch[2]);
      const year = Number(dateMatch[3]);
      const candidate = new Date(Date.UTC(year, month - 1, day));
      if (
        candidate.getUTCFullYear() === year &&
        candidate.getUTCMonth() === month - 1 &&
        candidate.getUTCDate() === day
      ) {
        return candidate;
      }
    }

    const duration = message.match(
      /\b(?:pregnant|pregnancy)\D{0,18}(\d{1,3})\s*days?\b|\b(\d{1,3})\s*days?\s+pregnant\b/i,
    );
    const days = Number(duration?.[1] || duration?.[2]);
    if (Number.isInteger(days) && days >= 14 && days <= 294) {
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() - days);
      return candidate;
    }

    if (
      /\b(?:one|1)\s+month(?:\s+)?pregnant\b|\bpregnant\s+(?:for\s+)?(?:one|1)\s+month\b/i.test(
        message,
      )
    ) {
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() - 30);
      return candidate;
    }
  }
  return null;
}

export function getPregnancyDueDateFromMessages(
  messages: string[],
): Date | null {
  for (const message of [...messages].reverse()) {
    const dateMatch = message.match(
      /(?:(?:estimated\s+)?due\s+date|\bedd\b)[\s\S]{0,30}?(\d{1,2})[\/-](\d{1,2})[\/-]((?:19|20)\d{2})/i,
    );
    const day = Number(dateMatch?.[1]);
    const month = Number(dateMatch?.[2]);
    const year = Number(dateMatch?.[3]);
    if (day && month && year) {
      const candidate = new Date(Date.UTC(year, month - 1, day));
      if (
        candidate.getUTCFullYear() === year &&
        candidate.getUTCMonth() === month - 1 &&
        candidate.getUTCDate() === day
      ) {
        return candidate;
      }
    }
  }
  return null;
}

export function getPregnancyDetailsFromLmp(
  lastPeriodDate: Date,
  now = new Date(),
): {
  daysPregnant: number;
  weeksPregnant: number;
  estimatedDueDate: Date;
  trimester: "first" | "second" | "third";
} {
  const daysPregnant = Math.floor(
    (now.getTime() - lastPeriodDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const weeksPregnant = Math.floor(daysPregnant / 7);
  const estimatedDueDate = new Date(lastPeriodDate);
  estimatedDueDate.setUTCDate(estimatedDueDate.getUTCDate() + 280);
  const trimester =
    weeksPregnant <= 13 ? "first" : weeksPregnant <= 27 ? "second" : "third";
  return { daysPregnant, weeksPregnant, estimatedDueDate, trimester };
}

export function isPregnancyRecordQuestion(message: string): boolean {
  return /\b(due\s*date|estimated\s*due|last\s*(?:menstrual\s*)?period|lmp|how\s+(?:many\s+)?weeks|pregnancy\s+(?:details|record|information))\b/i.test(
    message,
  );
}

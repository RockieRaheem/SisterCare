import { Counsellor, SessionPriority } from "@/types";

export interface CounsellorEligibility {
  eligible: boolean;
  reasons: string[];
}

export class CounsellorEligibilityError extends Error {
  constructor(public readonly reasons: string[]) {
    super(`Counsellor is not operationally eligible: ${reasons.join(", ")}`);
    this.name = "CounsellorEligibilityError";
  }
}

export function describeCounsellorEligibilityFailure(
  reasons: string[],
): string {
  if (reasons.includes("verification_required")) {
    return "Your verified counsellor record is not active. Refresh your application status or contact an administrator.";
  }
  if (reasons.includes("credentials_expired")) {
    return "Your professional credential has expired. Submit an updated credential before going available.";
  }
  if (reasons.includes("not_accepting_sessions")) {
    return "New sessions are disabled for your account. Ask an administrator to enable accepting sessions.";
  }
  if (reasons.includes("off_shift")) {
    return "You are outside the shift hours configured for your account. Ask an administrator to update your schedule if you are on duty.";
  }
  if (reasons.includes("at_capacity")) {
    return "You are already at your active-session capacity.";
  }
  if (reasons.includes("crisis_training_required")) {
    return "Crisis sessions require current crisis-response training.";
  }
  return "Your account is not currently eligible to receive sessions.";
}

export function evaluateCounsellorStanding(
  counsellor: Counsellor,
  now: Date = new Date(),
): CounsellorEligibility {
  const reasons: string[] = [];
  if (!counsellor.verified || counsellor.verificationStatus !== "verified") {
    reasons.push("verification_required");
  }
  if (
    counsellor.credentialExpiresAt &&
    counsellor.credentialExpiresAt.getTime() <= now.getTime()
  ) {
    reasons.push("credentials_expired");
  }
  return { eligible: reasons.length === 0, reasons };
}

function minutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function isCounsellorOnShift(
  counsellor: Pick<Counsellor, "availableHours">,
  now: Date,
): boolean {
  const weekday = now.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "Africa/Kampala",
  });
  if (!counsellor.availableHours.days.includes(weekday)) return false;

  const kampalaParts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Kampala",
  }).formatToParts(now);
  const hour = Number(kampalaParts.find((part) => part.type === "hour")?.value);
  const minute = Number(
    kampalaParts.find((part) => part.type === "minute")?.value,
  );
  const current = hour * 60 + minute;
  const start = minutes(counsellor.availableHours.start);
  const end = minutes(counsellor.availableHours.end);
  if (start === null || end === null) return false;
  return start <= end
    ? current >= start && current < end
    : current >= start || current < end;
}

export function evaluateCounsellorEligibility(
  counsellor: Counsellor,
  options: {
    now?: Date;
    activeLoad: number;
    priority: SessionPriority;
  },
): CounsellorEligibility {
  const now = options.now ?? new Date();
  const reasons = [...evaluateCounsellorStanding(counsellor, now).reasons];
  if (counsellor.acceptingNewSessions !== true) {
    reasons.push("not_accepting_sessions");
  }
  if (!isCounsellorOnShift(counsellor, now)) {
    reasons.push("off_shift");
  }
  const capacity = Math.max(1, counsellor.maxConcurrentSessions ?? 1);
  if (options.activeLoad >= capacity) {
    reasons.push("at_capacity");
  }
  if (options.priority === "critical" && counsellor.crisisTrained !== true) {
    reasons.push("crisis_training_required");
  }

  return { eligible: reasons.length === 0, reasons };
}

export type CrisisEscalationAction =
  | "none"
  | "alert_counsellors"
  | "notify_supervisor"
  | "show_emergency_fallback"
  | "open_incident";

export const CRISIS_ESCALATION_THRESHOLDS_MINUTES = {
  alert_counsellors: 1,
  notify_supervisor: 3,
  show_emergency_fallback: 5,
  open_incident: 10,
} as const;

export function evaluateCrisisEscalation(
  requestedAt: Date,
  currentLevel: number,
  now: Date = new Date(),
): { level: number; action: CrisisEscalationAction } {
  const waitMinutes = (now.getTime() - requestedAt.getTime()) / 60_000;
  const steps: Array<{
    level: number;
    minutes: number;
    action: CrisisEscalationAction;
  }> = [
    { level: 4, minutes: 10, action: "open_incident" },
    { level: 3, minutes: 5, action: "show_emergency_fallback" },
    { level: 2, minutes: 3, action: "notify_supervisor" },
    { level: 1, minutes: 1, action: "alert_counsellors" },
  ];
  const due = steps.find(
    (step) => waitMinutes >= step.minutes && currentLevel < step.level,
  );
  return due ? { level: due.level, action: due.action } : { level: currentLevel, action: "none" };
}

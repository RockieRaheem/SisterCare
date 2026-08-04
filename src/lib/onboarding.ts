import { calculateNextPeriod, getCycleInfo } from "@/lib/cycle";

export type OnboardingRequest =
  | { mode: "skip" }
  | {
      mode: "complete";
      displayName?: string;
      lastPeriodDate: string;
      cycleLength: number;
      periodLength: number;
      reminderDays: number;
    };

export function isOnboardingEditMode(mode: string | null): boolean {
  return mode === "edit";
}

export function buildOnboardingProfileUpdate(
  input: OnboardingRequest,
  now = new Date(),
): Record<string, unknown> {
  if (input.mode === "skip") {
    return {
      onboarding_completed: true,
      updated_at: now.toISOString(),
    };
  }

  const displayName = input.displayName?.trim() || null;
  if (displayName && displayName.length > 50) {
    throw new Error("Your name must be 50 characters or fewer.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.lastPeriodDate)) {
    throw new Error("Choose a valid last period date.");
  }
  const lastPeriodDate = new Date(`${input.lastPeriodDate}T00:00:00.000Z`);
  if (
    Number.isNaN(lastPeriodDate.getTime()) ||
    lastPeriodDate.getTime() > now.getTime()
  ) {
    throw new Error("The last period date cannot be in the future.");
  }
  if (!Number.isInteger(input.cycleLength) || input.cycleLength < 21 || input.cycleLength > 40) {
    throw new Error("Cycle length must be between 21 and 40 days.");
  }
  if (!Number.isInteger(input.periodLength) || input.periodLength < 2 || input.periodLength > 10) {
    throw new Error("Period length must be between 2 and 10 days.");
  }
  if (!Number.isInteger(input.reminderDays) || input.reminderDays < 1 || input.reminderDays > 14) {
    throw new Error("Reminder timing must be between 1 and 14 days.");
  }

  const nextPeriodDate = calculateNextPeriod(
    lastPeriodDate,
    input.cycleLength,
    now,
  );
  const { phase } = getCycleInfo(
    lastPeriodDate,
    input.cycleLength,
    input.periodLength,
    now,
  );

  return {
    ...(displayName ? { display_name: displayName } : {}),
    onboarding_completed: true,
    cycle_data: {
      lastPeriodDate: lastPeriodDate.toISOString(),
      cycleLength: input.cycleLength,
      periodLength: input.periodLength,
      nextPeriodDate: nextPeriodDate.toISOString(),
      currentPhase: phase,
      symptoms: [],
      history: [],
    },
    updated_at: now.toISOString(),
  };
}

export function periodReminderPayload(
  userId: string,
  nextPeriodDate: Date,
  reminderDays: number,
  now = new Date(),
): Record<string, unknown> | null {
  const scheduledFor = new Date(nextPeriodDate);
  scheduledFor.setUTCDate(scheduledFor.getUTCDate() - reminderDays);
  if (scheduledFor.getTime() <= now.getTime()) return null;
  return {
    userId,
    type: "period_coming",
    title: "Period coming soon",
    message: `Your period is expected in ${reminderDays} days. Time to prepare.`,
    scheduledFor: scheduledFor.toISOString(),
    sent: false,
    read: false,
    source: "onboarding",
  };
}

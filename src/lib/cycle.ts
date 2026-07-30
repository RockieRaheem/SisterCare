/**
 * Canonical menstrual cycle math for SisterCare.
 *
 * This is the single source of truth for phase calculation, next-period
 * prediction, and lateness tracking. It is deliberately free of Supabase or
 * network imports so it can be unit-tested in isolation — this math is the
 * product's core value, and both the agent and the data layer must agree on it.
 *
 * Phase boundaries (per cycle day, 1-indexed):
 *   menstrual   : day 1 .. periodLength
 *   follicular  : .. floor(cycleLength * 0.45)
 *   ovulation   : .. floor(cycleLength * 0.55)
 *   luteal      : remainder of the cycle
 */

const DAY_MS = 1000 * 60 * 60 * 24;

export interface CycleInfo {
  phase: string;
  dayInCycle: number;
  daysUntilNextPeriod: number;
  nextPeriodDate: Date;
  currentCycleStart: Date;
  isInPeriod: boolean;
  isPeriodLate: boolean;
  daysLate: number;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  // Health dates are calendar dates, not local instants. UTC normalization
  // keeps browser calculations identical to Vercel regardless of timezone.
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * The next UPCOMING period date, rolling forward over any complete cycles
 * that have passed since the last logged period.
 */
export function calculateNextPeriod(
  lastPeriodDate: Date,
  cycleLength: number,
  today: Date = new Date(),
): Date {
  const todayNorm = startOfDay(today);
  const lastPeriod = startOfDay(lastPeriodDate);

  const daysSinceLast = Math.floor(
    (todayNorm.getTime() - lastPeriod.getTime()) / DAY_MS,
  );
  const cyclesPassed = Math.floor(daysSinceLast / cycleLength);
  const currentCycleStart = addDays(lastPeriod, cyclesPassed * cycleLength);

  return addDays(currentCycleStart, cycleLength);
}

/**
 * Comprehensive cycle state for a given day (defaults to today).
 *
 * Semantics note: once a full cycle passes without the user logging a new
 * period, predictions roll forward to the estimated current cycle, while
 * `isPeriodLate` stays true and `daysLate` keeps growing from the FIRST
 * missed period. That pairing is intentional: the rolled-forward dates keep
 * reminders useful, while the lateness flag keeps nudging the user to confirm
 * (and, past a threshold, powers the pregnancy-possibility prompt).
 */
export function getCycleInfo(
  lastPeriodDate: Date,
  cycleLength: number,
  periodLength: number,
  today: Date = new Date(),
): CycleInfo {
  const todayNorm = startOfDay(today);
  const lastPeriod = startOfDay(lastPeriodDate);

  const daysSinceLast = Math.floor(
    (todayNorm.getTime() - lastPeriod.getTime()) / DAY_MS,
  );

  const cyclesPassed = Math.floor(daysSinceLast / cycleLength);
  const currentCycleStart = addDays(lastPeriod, cyclesPassed * cycleLength);

  const daysSinceCurrentCycleStart = Math.floor(
    (todayNorm.getTime() - currentCycleStart.getTime()) / DAY_MS,
  );
  const dayInCycle = daysSinceCurrentCycleStart + 1;

  const nextPeriodDate = addDays(currentCycleStart, cycleLength);
  const daysUntilNextPeriod = Math.floor(
    (nextPeriodDate.getTime() - todayNorm.getTime()) / DAY_MS,
  );

  const isInPeriod = dayInCycle <= periodLength;

  const firstExpectedPeriod = addDays(lastPeriod, cycleLength);
  const isPeriodLate = cyclesPassed >= 1 && todayNorm > firstExpectedPeriod;
  const daysLate = isPeriodLate ? daysSinceLast - cycleLength : 0;

  let phase: string;
  if (dayInCycle <= periodLength) {
    phase = "menstrual";
  } else if (dayInCycle <= Math.floor(cycleLength * 0.45)) {
    phase = "follicular";
  } else if (dayInCycle <= Math.floor(cycleLength * 0.55)) {
    phase = "ovulation";
  } else {
    phase = "luteal";
  }

  return {
    phase,
    dayInCycle,
    daysUntilNextPeriod,
    nextPeriodDate,
    currentCycleStart,
    isInPeriod,
    isPeriodLate,
    daysLate,
  };
}

/**
 * Simplified phase view (kept for backward compatibility with older callers).
 */
export function getCurrentPhase(
  lastPeriodDate: Date,
  cycleLength: number,
  periodLength: number,
): { phase: string; dayInCycle: number; daysUntilNextPeriod: number } {
  const info = getCycleInfo(lastPeriodDate, cycleLength, periodLength);
  return {
    phase: info.phase,
    dayInCycle: info.dayInCycle,
    daysUntilNextPeriod: info.daysUntilNextPeriod,
  };
}

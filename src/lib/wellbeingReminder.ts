import { localWellbeingDate } from "@/lib/wellbeing";

export const WELLBEING_REMINDER_HOUR = 18;

export function shouldSendWellbeingReminder({
  now,
  enabled,
  alreadyCheckedIn,
  lastReminderDate,
}: {
  now: Date;
  enabled: boolean;
  alreadyCheckedIn: boolean;
  lastReminderDate: string | null;
}): boolean {
  const today = localWellbeingDate(now);
  return (
    enabled &&
    !alreadyCheckedIn &&
    now.getHours() >= WELLBEING_REMINDER_HOUR &&
    lastReminderDate !== today
  );
}

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import {
  showBrowserNotification,
  storeNotification,
} from "@/lib/notifications";
import { localWellbeingDate } from "@/lib/wellbeing";
import { shouldSendWellbeingReminder } from "@/lib/wellbeingReminder";
import type { WellbeingCheckIn } from "@/types";

const reminderKey = (uid: string) => `sistercare_wellbeing_reminder_${uid}`;

export default function WellbeingReminder() {
  const { user, userProfile } = useAuth();
  const checkingRef = useRef(false);
  const isMember =
    userProfile?.role !== "admin" &&
    userProfile?.role !== "counsellor" &&
    userProfile?.registrationIntent !== "counsellor";

  const check = useCallback(async () => {
    if (
      !user?.uid ||
      !userProfile ||
      !isMember ||
      checkingRef.current ||
      userProfile.preferences.pushNotifications === false
    ) {
      return;
    }
    checkingRef.current = true;
    try {
      const now = new Date();
      const today = localWellbeingDate(now);
      const lastReminderDate = localStorage.getItem(reminderKey(user.uid));
      if (
        !shouldSendWellbeingReminder({
          now,
          enabled: true,
          alreadyCheckedIn: false,
          lastReminderDate,
        })
      ) {
        return;
      }

      const response = await authenticatedFetch("/api/wellbeing", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = await response.json().catch(() => ({}));
      const alreadyCheckedIn = (payload.data?.checkIns || []).some(
        (entry: Pick<WellbeingCheckIn, "localDate">) => entry.localDate === today,
      );
      if (
        !shouldSendWellbeingReminder({
          now,
          enabled: true,
          alreadyCheckedIn,
          lastReminderDate,
        })
      ) {
        return;
      }

      const id = `wellbeing-pulse-${today}`;
      const title = "A moment for you";
      const message = "Take a private five-second check-in, then choose support if you need it.";
      const href = "/wellbeing";
      storeNotification(
        {
          id,
          type: "wellbeing_checkin",
          title,
          message,
          href,
          timestamp: now,
          read: false,
        },
        user.uid,
      );
      showBrowserNotification(title, {
        body: message,
        tag: id,
        data: { href },
      });
      localStorage.setItem(reminderKey(user.uid), today);
    } catch {
      // A reminder must never interrupt the member experience.
    } finally {
      checkingRef.current = false;
    }
  }, [isMember, user?.uid, userProfile]);

  useEffect(() => {
    if (!user?.uid || !userProfile || !isMember) return;
    void check();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, 30 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check, isMember, user?.uid, userProfile]);

  return null;
}

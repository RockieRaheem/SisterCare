"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { showBrowserNotification, storeNotification } from "@/lib/notifications";
import {
  getWellbeingCheckIns,
  markWellbeingFollowUpDelivered,
} from "@/lib/wellbeingClient";

export default function WellbeingFollowUpNotifier() {
  const { user, userProfile } = useAuth();
  const checking = useRef(false);
  const isMember =
    userProfile?.role !== "admin" &&
    userProfile?.role !== "counsellor" &&
    userProfile?.registrationIntent !== "counsellor";

  const check = useCallback(async () => {
    if (!user?.uid || !userProfile || !isMember || checking.current) return;
    checking.current = true;
    try {
      const now = Date.now();
      const due = (await getWellbeingCheckIns(user.uid)).find((entry) => {
        if (!entry.followUpAt || entry.followUpDeliveredAt) return false;
        const dueAt = new Date(entry.followUpAt).getTime();
        return Number.isFinite(dueAt) && dueAt <= now;
      });
      if (!due) return;

      await markWellbeingFollowUpDelivered(user.uid, due);
      const id = `wellbeing-followup-${due.id}`;
      const title = "Your requested check-in";
      const message = "SisterCare is ready when you are. Choose whether to talk, pause, or reach a counsellor.";
      storeNotification(
        {
          id,
          type: "wellbeing_followup",
          title,
          message,
          href: "/wellbeing",
          timestamp: new Date(),
          read: false,
        },
        user.uid,
      );
      if (userProfile.preferences.pushNotifications !== false) {
        showBrowserNotification(title, {
          body: "The private follow-up you requested is ready.",
          tag: id,
          data: { href: "/wellbeing" },
        });
      }
    } catch {
      // A requested follow-up must never block or interrupt the member workspace.
    } finally {
      checking.current = false;
    }
  }, [isMember, user?.uid, userProfile]);

  useEffect(() => {
    if (!user?.uid || !userProfile || !isMember) return;
    void check();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, 60_000);
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

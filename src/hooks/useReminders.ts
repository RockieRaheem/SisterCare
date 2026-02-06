"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getPendingReminders,
  markReminderRead,
  schedulePeriodReminders,
  getUserProfile,
} from "@/lib/firestore";
import { Reminder } from "@/types";

interface UseRemindersReturn {
  reminders: Reminder[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (reminderId: string) => Promise<void>;
  refreshReminders: () => Promise<void>;
  checkAndScheduleReminders: () => Promise<void>;
}

/**
 * Custom hook to manage user reminders
 * Handles fetching, displaying, and managing period reminders
 */
export function useReminders(): UseRemindersReturn {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch pending reminders
  const fetchReminders = useCallback(async () => {
    if (!user) {
      setReminders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const pendingReminders = await getPendingReminders(user.uid);

      // Filter reminders that should be shown now
      const now = new Date();
      const activeReminders = pendingReminders.filter(
        (reminder) => new Date(reminder.scheduledFor) <= now,
      );

      setReminders(activeReminders);
    } catch (err) {
      console.error("Error fetching reminders:", err);
      setError("Failed to load reminders");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Mark a reminder as read
  const markAsRead = useCallback(
    async (reminderId: string) => {
      if (!user) return;

      try {
        await markReminderRead(user.uid, reminderId);
        setReminders((prev) =>
          prev.map((r) => (r.id === reminderId ? { ...r, read: true } : r)),
        );
      } catch (err) {
        console.error("Error marking reminder as read:", err);
      }
    },
    [user],
  );

  // Check and schedule new reminders based on cycle data
  const checkAndScheduleReminders = useCallback(async () => {
    if (!user) return;

    try {
      const profile = await getUserProfile(user.uid);

      if (
        profile?.cycleData?.nextPeriodDate &&
        profile?.preferences?.reminderDaysBefore
      ) {
        await schedulePeriodReminders(
          user.uid,
          profile.cycleData.nextPeriodDate,
          profile.preferences.reminderDaysBefore,
        );
      }
    } catch (err) {
      console.error("Error scheduling reminders:", err);
    }
  }, [user]);

  // Refresh reminders
  const refreshReminders = useCallback(async () => {
    await fetchReminders();
  }, [fetchReminders]);

  // Initial fetch
  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  // Check for new reminders periodically (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(fetchReminders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchReminders]);

  const unreadCount = reminders.filter((r) => !r.read).length;

  return {
    reminders,
    unreadCount,
    loading,
    error,
    markAsRead,
    refreshReminders,
    checkAndScheduleReminders,
  };
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

/**
 * Show a browser notification
 */
export function showBrowserNotification(
  title: string,
  options?: NotificationOptions,
): void {
  if (Notification.permission === "granted") {
    new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      ...options,
    });
  }
}

/**
 * Calculate days until next period from a date
 */
export function getDaysUntilPeriod(nextPeriodDate: Date): number {
  const now = new Date();
  const diffTime = nextPeriodDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Format reminder message based on days until period
 */
export function formatReminderMessage(daysUntil: number): string {
  if (daysUntil === 0) {
    return "Your period may start today. Make sure you're prepared! 💜";
  } else if (daysUntil === 1) {
    return "Your period is expected tomorrow. Time to get ready! 💜";
  } else if (daysUntil <= 3) {
    return `Your period is expected in ${daysUntil} days. A gentle reminder to prepare. 💜`;
  } else {
    return `Your period is expected in ${daysUntil} days. Stay prepared and take care of yourself! 💜`;
  }
}

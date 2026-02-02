"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  useReminders,
  requestNotificationPermission,
  showBrowserNotification,
} from "@/hooks/useReminders";

interface ReminderBannerProps {
  className?: string;
}

/**
 * Banner component to display active reminders
 * Shows period reminders at the top of pages
 */
export default function ReminderBanner({
  className = "",
}: ReminderBannerProps) {
  const { reminders, unreadCount, markAsRead, loading } = useReminders();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [notificationPermission, setNotificationPermission] =
    useState<boolean>(false);

  useEffect(() => {
    // Check notification permission on mount
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission === "granted");
    }
  }, []);

  useEffect(() => {
    // Show browser notification for new unread reminders
    if (notificationPermission && unreadCount > 0) {
      const unreadReminder = reminders.find(
        (r) => !r.read && !dismissed.has(r.id),
      );
      if (unreadReminder) {
        showBrowserNotification(unreadReminder.title, {
          body: unreadReminder.message,
          tag: unreadReminder.id,
        });
      }
    }
  }, [reminders, unreadCount, notificationPermission, dismissed]);

  const handleDismiss = async (reminderId: string) => {
    setDismissed((prev) => new Set([...prev, reminderId]));
    await markAsRead(reminderId);
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(granted);
  };

  // Get active (not dismissed) reminders
  const activeReminders = reminders.filter((r) => !dismissed.has(r.id));

  if (loading || activeReminders.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {activeReminders.map((reminder) => (
        <div
          key={reminder.id}
          className="bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-xl p-4 animate-slideDown"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/20 rounded-lg shrink-0">
              <span className="material-symbols-outlined text-primary">
                {reminder.type === "period_coming"
                  ? "calendar_today"
                  : "notifications"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-primary font-bold text-sm mb-1">
                {reminder.title}
              </h4>
              <p className="text-text-secondary text-sm">{reminder.message}</p>
            </div>
            <button
              onClick={() => handleDismiss(reminder.id)}
              className="p-1 hover:bg-primary/10 rounded-lg transition-colors shrink-0"
              aria-label="Dismiss reminder"
            >
              <span className="material-symbols-outlined text-text-secondary text-xl">
                close
              </span>
            </button>
          </div>
        </div>
      ))}

      {/* Notification Permission Request */}
      {!notificationPermission && "Notification" in window && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">
              notifications_off
            </span>
            <div className="flex-1">
              <p className="text-amber-800 dark:text-amber-300 text-sm font-medium">
                Enable notifications to never miss a reminder
              </p>
            </div>
            <button
              onClick={handleEnableNotifications}
              className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors"
            >
              Enable
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

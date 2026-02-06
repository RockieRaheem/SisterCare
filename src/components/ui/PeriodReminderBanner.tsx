"use client";

import { useState, useEffect } from "react";
import {
  PeriodNotification,
  generatePeriodReminder,
  storeNotification,
  shouldShowNotificationToday,
  markNotificationShownToday,
  requestNotificationPermission,
  getNotificationPermission,
  showBrowserNotification,
  setCurrentUser,
} from "@/lib/notifications";

interface PeriodReminderBannerProps {
  daysUntilPeriod: number;
  userName?: string;
  userId?: string;
  reminderDaysBefore?: number;
}

export default function PeriodReminderBanner({
  daysUntilPeriod,
  userName,
  userId,
  reminderDaysBefore = 3,
}: PeriodReminderBannerProps) {
  const [notification, setNotification] = useState<PeriodNotification | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");

  useEffect(() => {
    // Set current user for notification scoping
    if (userId) {
      setCurrentUser(userId);
    }

    // Check notification permission
    setNotificationPermission(getNotificationPermission());

    // Only show if within reminder window and not shown today
    if (daysUntilPeriod <= reminderDaysBefore || daysUntilPeriod <= 0) {
      const reminder = generatePeriodReminder(daysUntilPeriod, userName);

      if (reminder) {
        setNotification(reminder);

        // Store notification if not shown today (user-scoped)
        if (userId && shouldShowNotificationToday(userId)) {
          storeNotification(reminder, userId);
          markNotificationShownToday(userId);

          // Try to show browser notification
          if (getNotificationPermission() === "granted") {
            showBrowserNotification(reminder.title, {
              body: reminder.message,
            });
          }
        }
      }
    }
  }, [daysUntilPeriod, userName, userId, reminderDaysBefore]);

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);

    if (permission === "granted" && notification) {
      showBrowserNotification(notification.title, {
        body: notification.message,
      });
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (dismissed || !notification) return null;

  const getBannerStyles = () => {
    if (daysUntilPeriod <= 0) {
      return {
        bg: "bg-gradient-to-r from-red-500 to-pink-500",
        icon: "water_drop",
        borderColor: "border-red-400",
      };
    }
    if (daysUntilPeriod === 1) {
      return {
        bg: "bg-gradient-to-r from-amber-500 to-orange-500",
        icon: "calendar_today",
        borderColor: "border-amber-400",
      };
    }
    if (daysUntilPeriod <= 3) {
      return {
        bg: "bg-gradient-to-r from-primary to-purple-600",
        icon: "event_upcoming",
        borderColor: "border-primary",
      };
    }
    return {
      bg: "bg-gradient-to-r from-blue-500 to-primary",
      icon: "schedule",
      borderColor: "border-blue-400",
    };
  };

  const styles = getBannerStyles();

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${styles.bg} text-white shadow-lg animate-fade-in`}
    >
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative p-4 sm:p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <span className="material-symbols-outlined text-2xl">
              {styles.icon}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-lg">{notification.title}</h3>
              <button
                onClick={handleDismiss}
                className="shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Dismiss"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <p className="text-white/90 text-sm mt-1">{notification.message}</p>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {notificationPermission !== "granted" &&
                notificationPermission !== "unsupported" && (
                  <button
                    onClick={handleEnableNotifications}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-xs font-medium transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">
                      notifications_active
                    </span>
                    Enable Reminders
                  </button>
                )}
              {notificationPermission === "granted" && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-full text-xs">
                  <span className="material-symbols-outlined text-sm">
                    check_circle
                  </span>
                  Notifications On
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

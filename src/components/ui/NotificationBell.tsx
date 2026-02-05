"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PeriodNotification,
  getStoredNotifications,
  markNotificationRead,
  clearAllNotifications,
} from "@/lib/notifications";

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = "" }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<PeriodNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications
  const loadNotifications = useCallback(() => {
    const stored = getStoredNotifications();
    setNotifications(stored);
    setUnreadCount(stored.filter((n) => !n.read).length);
  }, []);

  useEffect(() => {
    loadNotifications();

    // Refresh every minute
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMarkRead = (id: string) => {
    markNotificationRead(id);
    loadNotifications();
  };

  const handleClearAll = () => {
    clearAllNotifications();
    setNotifications([]);
    setUnreadCount(0);
    setIsOpen(false);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  };

  const getNotificationIcon = (type: PeriodNotification["type"]) => {
    switch (type) {
      case "period_today":
        return "water_drop";
      case "period_reminder":
        return "calendar_today";
      case "phase_change":
        return "sync";
      case "wellness_tip":
        return "lightbulb";
      default:
        return "notifications";
    }
  };

  const getNotificationColor = (type: PeriodNotification["type"]) => {
    switch (type) {
      case "period_today":
        return "text-red-500 bg-red-50 dark:bg-red-900/20";
      case "period_reminder":
        return "text-amber-500 bg-amber-50 dark:bg-amber-900/20";
      case "phase_change":
        return "text-purple-500 bg-purple-50 dark:bg-purple-900/20";
      case "wellness_tip":
        return "text-green-500 bg-green-50 dark:bg-green-900/20";
      default:
        return "text-primary bg-primary/10";
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
      >
        <span className="material-symbols-outlined text-text-primary dark:text-white">
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Notification Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] bg-white dark:bg-card-dark rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-bold text-text-primary dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  notifications_active
                </span>
                Notifications
              </h3>
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[50vh]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2 block">
                    notifications_off
                  </span>
                  <p className="text-sm text-gray-500">No notifications yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Period reminders will appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleMarkRead(notification.id)}
                      className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        !notification.read ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        <div
                          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getNotificationColor(
                            notification.type
                          )}`}
                        >
                          <span className="material-symbols-outlined text-lg">
                            {getNotificationIcon(notification.type)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm font-semibold ${
                                !notification.read
                                  ? "text-text-primary dark:text-white"
                                  : "text-gray-600 dark:text-gray-400"
                              }`}
                            >
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="shrink-0 w-2 h-2 bg-primary rounded-full mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-2">
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-[10px] text-gray-400 text-center">
                  Notifications are stored locally on your device
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

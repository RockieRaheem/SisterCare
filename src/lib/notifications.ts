/**
 * Notification Service for SisterCare
 * Handles browser notifications and in-app alerts for period reminders
 */

export interface PeriodNotification {
  id: string;
  type: "period_reminder" | "period_today" | "phase_change" | "wellness_tip";
  title: string;
  message: string;
  daysUntil?: number;
  timestamp: Date;
  read: boolean;
}

// Check if browser supports notifications
export const isNotificationSupported = (): boolean => {
  return typeof window !== "undefined" && "Notification" in window;
};

// Request notification permission
export const requestNotificationPermission =
  async (): Promise<NotificationPermission> => {
    if (!isNotificationSupported()) {
      console.warn("Notifications not supported in this browser");
      return "denied";
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return "denied";
    }
  };

// Get current notification permission status
export const getNotificationPermission = ():
  | NotificationPermission
  | "unsupported" => {
  if (!isNotificationSupported()) {
    return "unsupported";
  }
  return Notification.permission;
};

// Show a browser notification
export const showBrowserNotification = (
  title: string,
  options?: NotificationOptions,
): Notification | null => {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return null;
  }

  try {
    const notification = new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "sistercare-reminder",
      requireInteraction: false,
      ...options,
    });

    // Auto close after 10 seconds
    setTimeout(() => notification.close(), 10000);

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  } catch (error) {
    console.error("Error showing notification:", error);
    return null;
  }
};

// Generate period reminder notification based on days until period
export const generatePeriodReminder = (
  daysUntilPeriod: number,
  userName?: string,
): PeriodNotification | null => {
  const greeting = userName ? `Hi ${userName}! ` : "";

  if (daysUntilPeriod < 0) {
    // Period might be late
    return {
      id: `period-late-${Date.now()}`,
      type: "period_reminder",
      title: "Period Check-In 💜",
      message: `${greeting}Your period was expected ${Math.abs(daysUntilPeriod)} day${Math.abs(daysUntilPeriod) !== 1 ? "s" : ""} ago. Don't worry, cycles can vary! If you've started, remember to update your tracker.`,
      daysUntil: daysUntilPeriod,
      timestamp: new Date(),
      read: false,
    };
  }

  if (daysUntilPeriod === 0) {
    return {
      id: `period-today-${Date.now()}`,
      type: "period_today",
      title: "Period Day! 🌸",
      message: `${greeting}Your period is expected today. Take care of yourself! Rest, stay hydrated, and don't hesitate to reach out to Sister if you need support.`,
      daysUntil: 0,
      timestamp: new Date(),
      read: false,
    };
  }

  if (daysUntilPeriod === 1) {
    return {
      id: `period-tomorrow-${Date.now()}`,
      type: "period_reminder",
      title: "Period Coming Tomorrow 🌷",
      message: `${greeting}Your period is expected tomorrow. Make sure you have supplies ready and consider wearing dark clothes. You've got this!`,
      daysUntil: 1,
      timestamp: new Date(),
      read: false,
    };
  }

  if (daysUntilPeriod <= 3) {
    return {
      id: `period-soon-${Date.now()}`,
      type: "period_reminder",
      title: `Period in ${daysUntilPeriod} Days 📅`,
      message: `${greeting}Your period is expected in ${daysUntilPeriod} days. Good time to stock up on supplies and plan some self-care activities!`,
      daysUntil: daysUntilPeriod,
      timestamp: new Date(),
      read: false,
    };
  }

  if (daysUntilPeriod <= 7) {
    return {
      id: `period-week-${Date.now()}`,
      type: "period_reminder",
      title: `Period in ${daysUntilPeriod} Days 🗓️`,
      message: `${greeting}Your period is about a week away. You might start experiencing PMS symptoms soon. Remember to be gentle with yourself!`,
      daysUntil: daysUntilPeriod,
      timestamp: new Date(),
      read: false,
    };
  }

  return null; // No notification needed for periods more than 7 days away
};

// Generate wellness tips based on cycle phase
export const generatePhaseTip = (
  phase: string,
  dayInCycle: number,
): PeriodNotification | null => {
  const tips: Record<string, string[]> = {
    menstrual: [
      "Rest is productive! Your body is working hard right now. 💤",
      "Iron-rich foods like spinach and beans can help replenish what you lose. 🥬",
      "Gentle stretching or yoga can help ease cramps. 🧘‍♀️",
      "Hot water bottles or heating pads are your best friend! 🔥",
    ],
    follicular: [
      "Energy is rising! Great time to start new projects. ✨",
      "Your brain is extra sharp now - perfect for learning! 📚",
      "Social activities feel easier during this phase. 👯‍♀️",
      "Great time for trying new workout routines! 💪",
    ],
    ovulation: [
      "You're at peak energy! Make the most of it. 🌟",
      "Communication skills are enhanced - speak your truth! 🗣️",
      "Skin often glows during ovulation - you're radiant! ✨",
      "High energy for both work and social activities. 🎉",
    ],
    luteal: [
      "Comfort foods calling? That's normal! Choose wisely. 🍫",
      "Journaling can help process the emotions that come up. 📝",
      "Prioritize sleep - your body needs more rest now. 😴",
      "Magnesium-rich foods can help with PMS symptoms. 🥜",
    ],
  };

  const phaseTips = tips[phase.toLowerCase()];
  if (!phaseTips) return null;

  // Pick a random tip
  const randomTip = phaseTips[Math.floor(Math.random() * phaseTips.length)];

  return {
    id: `tip-${phase}-${Date.now()}`,
    type: "wellness_tip",
    title: `${phase.charAt(0).toUpperCase() + phase.slice(1)} Phase Tip`,
    message: randomTip,
    timestamp: new Date(),
    read: false,
  };
};

// Schedule check for period reminders (to be called on app load)
export const checkAndNotify = async (
  daysUntilPeriod: number,
  reminderDaysBefore: number,
  userName?: string,
): Promise<PeriodNotification | null> => {
  // Only show notification if within reminder window
  if (daysUntilPeriod <= reminderDaysBefore || daysUntilPeriod <= 0) {
    const notification = generatePeriodReminder(daysUntilPeriod, userName);

    if (notification && Notification.permission === "granted") {
      // Show browser notification
      showBrowserNotification(notification.title, {
        body: notification.message,
        icon: "/favicon.ico",
      });
    }

    return notification;
  }

  return null;
};

// Store notifications in localStorage for persistence
// USER-SCOPED: Each user has their own notification storage
const getNotificationsKey = (userId?: string): string => {
  if (!userId) return ""; // No key if no user
  return `sistercare_notifications_${userId}`;
};

// Current user ID - set by NotificationBell component
let currentUserId: string | null = null;

export const setCurrentUser = (userId: string | null): void => {
  currentUserId = userId;
  // Clean up old global notifications on user change (legacy cleanup)
  if (typeof window !== "undefined") {
    localStorage.removeItem("sistercare_notifications"); // Remove old global key
  }
};

export const getStoredNotifications = (
  userId?: string,
): PeriodNotification[] => {
  if (typeof window === "undefined") return [];

  const uid = userId || currentUserId;
  if (!uid) return []; // No user = no notifications

  try {
    const key = getNotificationsKey(uid);
    const stored = localStorage.getItem(key);
    if (stored) {
      const notifications = JSON.parse(stored);
      return notifications.map((n: PeriodNotification) => ({
        ...n,
        timestamp: new Date(n.timestamp),
      }));
    }
  } catch (error) {
    console.error("Error reading notifications:", error);
  }
  return [];
};

export const storeNotification = (
  notification: PeriodNotification,
  userId?: string,
): void => {
  if (typeof window === "undefined") return;

  const uid = userId || currentUserId;
  if (!uid) return; // No user = don't store

  try {
    const key = getNotificationsKey(uid);
    const existing = getStoredNotifications(uid);
    // Keep only last 10 notifications
    const updated = [notification, ...existing].slice(0, 10);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (error) {
    console.error("Error storing notification:", error);
  }
};

export const markNotificationRead = (
  notificationId: string,
  userId?: string,
): void => {
  if (typeof window === "undefined") return;

  const uid = userId || currentUserId;
  if (!uid) return;

  try {
    const key = getNotificationsKey(uid);
    const existing = getStoredNotifications(uid);
    const updated = existing.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n,
    );
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (error) {
    console.error("Error updating notification:", error);
  }
};

export const clearAllNotifications = (userId?: string): void => {
  if (typeof window === "undefined") return;

  const uid = userId || currentUserId;
  if (!uid) return;

  const key = getNotificationsKey(uid);
  localStorage.removeItem(key);
};

// Check if we should show notification today (avoid spamming)
// USER-SCOPED: Each user has their own last notification timestamp
const getLastNotificationKey = (userId?: string): string => {
  const uid = userId || currentUserId;
  if (!uid) return "";
  return `sistercare_last_notification_${uid}`;
};

export const shouldShowNotificationToday = (userId?: string): boolean => {
  if (typeof window === "undefined") return false;

  const uid = userId || currentUserId;
  if (!uid) return false;

  try {
    const key = getLastNotificationKey(uid);
    const lastShown = localStorage.getItem(key);
    if (!lastShown) return true;

    const lastDate = new Date(lastShown);
    const today = new Date();

    // Only show once per day
    return lastDate.toDateString() !== today.toDateString();
  } catch {
    return true;
  }
};

export const markNotificationShownToday = (userId?: string): void => {
  if (typeof window === "undefined") return;

  const uid = userId || currentUserId;
  if (!uid) return;

  const key = getLastNotificationKey(uid);
  localStorage.setItem(key, new Date().toISOString());
};

/**
 * Push Notification Service for SisterCare
 * Handles scheduling and managing period/symptom reminders
 */
import { buildSystemNotificationContent } from "./notificationPrivacy";

// Types for scheduled notifications
export interface ScheduledReminder {
  id: string;
  type: "period" | "symptom" | "wellness" | "hydration" | "medication";
  title: string;
  body: string;
  scheduledTime: Date;
  recurring: boolean;
  interval?: "daily" | "weekly" | "monthly";
  enabled: boolean;
}

export interface ReminderSettings {
  periodReminder: boolean;
  periodReminderDays: number; // days before period
  hydrationReminder: boolean;
  hydrationInterval: number; // hours
  enabled: boolean;
}

const DEFAULT_SETTINGS: ReminderSettings = {
  periodReminder: true,
  periodReminderDays: 3,
  hydrationReminder: false,
  hydrationInterval: 2,
  enabled: true,
};

// Storage keys
const SETTINGS_KEY = "sistercare_reminder_settings";
const REMINDERS_KEY = "sistercare_scheduled_reminders";

/**
 * Check if the browser supports notifications
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}

/**
 * Request notification permission
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    console.warn("Push notifications not supported");
    return "denied";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error("Error requesting permission:", error);
    return "denied";
  }
}

/**
 * Get current permission status
 */
export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Schedule a local notification
 */
export async function scheduleNotification(
  title: string,
  body: string,
  delay: number, // milliseconds
  options?: {
    tag?: string;
    url?: string;
    vibrate?: boolean;
  },
): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== "granted") {
    return false;
  }

  // For immediate or short delays, use setTimeout
  if (delay < 60000) {
    // Less than 1 minute
    setTimeout(() => {
      showLocalNotification(title, body, options);
    }, delay);
    return true;
  }

  // For longer delays, store in localStorage and let app check on load
  const reminder: ScheduledReminder = {
    id: `reminder-${Date.now()}`,
    type: "wellness",
    title,
    body,
    scheduledTime: new Date(Date.now() + delay),
    recurring: false,
    enabled: true,
  };

  saveScheduledReminder(reminder);
  return true;
}

/**
 * Show a local notification immediately
 */
export function showLocalNotification(
  title: string,
  body: string,
  options?: {
    tag?: string;
    url?: string;
    vibrate?: boolean;
    allowSensitivePreview?: boolean;
  },
): void {
  if (Notification.permission !== "granted") return;

  const content = buildSystemNotificationContent(title, body, {
    allowSensitivePreview: options?.allowSensitivePreview,
  });
  const notification = new Notification(content.title, {
    body: content.body,
    icon: "/icons/sistercare-pink-v3-192x192.png",
    badge: "/icons/sistercare-pink-v3-192x192.png",
    tag: options?.tag || "sistercare-reminder",
    requireInteraction: false,
    silent: !options?.vibrate,
  });

  notification.onclick = () => {
    window.focus();
    if (options?.url) {
      window.location.href = options.url;
    }
    notification.close();
  };

  // Auto close after 10 seconds
  setTimeout(() => notification.close(), 10000);
}

/**
 * Schedule period reminder based on predicted date
 */
export function schedulePeriodReminder(
  predictedDate: Date,
  daysBefore: number = 3,
  userName?: string,
): void {
  const reminderDate = new Date(predictedDate);
  reminderDate.setDate(reminderDate.getDate() - daysBefore);
  reminderDate.setHours(9, 0, 0, 0); // 9 AM

  const now = new Date();
  if (reminderDate <= now) return; // Date has passed

  const delay = reminderDate.getTime() - now.getTime();
  const greeting = userName ? `Hi ${userName}! ` : "";

  const messages = [
    `${greeting}Your period is expected in ${daysBefore} days. Time to prepare! 🌸`,
    `${greeting}Heads up! Your period may arrive in ${daysBefore} days. Stock up on supplies! 💗`,
    `${greeting}Just a gentle reminder - your period is coming in ${daysBefore} days. Take care! ✨`,
  ];

  const body = messages[Math.floor(Math.random() * messages.length)];

  scheduleNotification("Period Reminder 📅", body, delay, {
    tag: "period-reminder",
    url: "/dashboard",
    vibrate: true,
  });
}

/**
 * Get reminder settings from localStorage
 */
export function getReminderSettings(userId?: string): ReminderSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const key = userId ? `${SETTINGS_KEY}_${userId}` : SETTINGS_KEY;
    const stored = localStorage.getItem(key);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Error reading reminder settings:", error);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save reminder settings to localStorage
 */
export function saveReminderSettings(
  settings: Partial<ReminderSettings>,
  userId?: string,
): void {
  if (typeof window === "undefined") return;

  try {
    const key = userId ? `${SETTINGS_KEY}_${userId}` : SETTINGS_KEY;
    const current = getReminderSettings(userId);
    const updated = { ...current, ...settings };
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (error) {
    console.error("Error saving reminder settings:", error);
  }
}

/**
 * Save scheduled reminder to localStorage
 */
function saveScheduledReminder(reminder: ScheduledReminder): void {
  if (typeof window === "undefined") return;

  try {
    const existing = getScheduledReminders();
    const updated = [...existing, reminder].slice(-20); // Keep last 20
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Error saving reminder:", error);
  }
}

/**
 * Get all scheduled reminders
 */
export function getScheduledReminders(): ScheduledReminder[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(REMINDERS_KEY);
    if (stored) {
      const reminders = JSON.parse(stored);
      return reminders.map((r: ScheduledReminder) => ({
        ...r,
        scheduledTime: new Date(r.scheduledTime),
      }));
    }
  } catch (error) {
    console.error("Error reading reminders:", error);
  }
  return [];
}

/**
 * Check and fire due reminders
 * Call this on app load to check for missed notifications
 */
export function checkDueReminders(): void {
  const reminders = getScheduledReminders();
  const now = new Date();
  const due = reminders.filter((r) => r.enabled && r.scheduledTime <= now);

  due.forEach((reminder) => {
    showLocalNotification(reminder.title, reminder.body, {
      tag: reminder.type,
      url: "/dashboard",
    });
  });

  // Remove fired non-recurring reminders
  const remaining = reminders.filter((r) => {
    if (!r.enabled) return true;
    if (r.scheduledTime > now) return true;
    return r.recurring; // Keep recurring ones
  });

  if (typeof window !== "undefined") {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(remaining));
  }
}

/**
 * Clear all scheduled reminders
 */
export function clearAllReminders(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(REMINDERS_KEY);
  }
}

/**
 * Initialize push notifications on app load
 */
export async function initializePushNotifications(
  userId?: string,
): Promise<void> {
  // Check for due reminders
  checkDueReminders();

  // Get user settings
  const settings = getReminderSettings(userId);

  // SisterCare never schedules emotional check-ins automatically. Only
  // reminders explicitly requested by the member are allowed here.
  void settings;
}

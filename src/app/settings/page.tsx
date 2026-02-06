"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Card from "@/components/ui/Card";
import Toggle from "@/components/ui/Toggle";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import {
  getUserProfile,
  updateUserPreferences,
  updateUserProfile,
} from "@/lib/firestore";
import {
  requestNotificationPermission,
  getNotificationPermission,
  showBrowserNotification,
} from "@/lib/notifications";
import { UserPreferences } from "@/types";

export default function SettingsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Settings state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [reminderDays, setReminderDays] = useState(3);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [browserNotificationStatus, setBrowserNotificationStatus] = useState<
    NotificationPermission | "unsupported"
  >("default");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  // Load user preferences
  useEffect(() => {
    if (user) {
      loadSettings();
    }
    // Check browser notification status
    setBrowserNotificationStatus(getNotificationPermission());
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const profile = await getUserProfile(user.uid);
      if (profile?.preferences) {
        setEmailNotifications(profile.preferences.emailNotifications ?? true);
        setPushNotifications(profile.preferences.pushNotifications ?? true);
        setReminderDays(profile.preferences.reminderDaysBefore ?? 3);
        setTheme(profile.preferences.theme ?? "system");
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const preferences: Partial<UserPreferences> = {
        emailNotifications,
        pushNotifications,
        reminderDaysBefore: reminderDays,
        theme,
      };

      await updateUserPreferences(user.uid, preferences);
      setMessage({ type: "success", text: "Settings saved successfully!" });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({
        type: "error",
        text: "Failed to save settings. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.",
    );

    if (!confirmed) return;

    const doubleConfirmed = window.confirm(
      "This is your final warning. Click OK to permanently delete your account and all associated data.",
    );

    if (!doubleConfirmed) return;

    // TODO: Implement account deletion
    alert(
      "Account deletion will be implemented. For now, please contact support.",
    );
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center safe-top safe-bottom">
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm sm:text-base">
            Loading settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
      <Header variant="app" />

      <main className="main-content flex-1 max-w-[960px] mx-auto w-full px-4 sm:px-5 md:px-10 py-4 sm:py-6 md:py-8 pb-24 md:pb-8">
        {/* Page Header */}
        <div className="flex flex-wrap justify-between gap-2 sm:gap-3 mb-5 sm:mb-6 md:mb-8">
          <div className="flex min-w-0 sm:min-w-72 flex-col gap-1.5 sm:gap-2 md:gap-3">
            <h1 className="text-text-primary dark:text-white text-2xl sm:text-3xl md:text-4xl font-black leading-tight tracking-tight">
              Settings & Privacy
            </h1>
            <p className="text-text-secondary text-sm sm:text-base font-normal leading-normal">
              Manage your preferences, notifications, and account security.
            </p>
          </div>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`mb-4 sm:mb-5 md:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl border flex items-center gap-2 sm:gap-3 text-sm sm:text-base ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
            }`}
          >
            <span className="material-symbols-outlined text-lg sm:text-xl">
              {message.type === "success" ? "check_circle" : "error"}
            </span>
            {message.text}
          </div>
        )}

        {/* Notification Preferences */}
        <h2 className="text-text-primary dark:text-white text-lg sm:text-xl md:text-[22px] font-bold leading-tight tracking-tight pb-2 sm:pb-3 pt-2 sm:pt-3 md:pt-4">
          Notification Preferences
        </h2>

        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-7 md:mb-8">
          <Card>
            <Toggle
              checked={emailNotifications}
              onChange={(checked) => setEmailNotifications(checked)}
              label="Email Notifications"
              description="Receive cycle predictions and health tips via email."
            />
          </Card>

          <Card>
            <Toggle
              checked={pushNotifications}
              onChange={(checked) => setPushNotifications(checked)}
              label="Push Notifications"
              description="Get reminders for symptom tracking and check-ins."
            />
          </Card>

          <Card>
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
                <div>
                  <p className="text-text-primary dark:text-white text-sm sm:text-base font-bold">
                    Period Reminder
                  </p>
                  <p className="text-text-secondary text-xs sm:text-sm">
                    How many days before your period to send a reminder
                  </p>
                </div>
                <select
                  value={reminderDays}
                  onChange={(e) => setReminderDays(Number(e.target.value))}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 rounded-lg border border-primary/20 bg-background-light dark:bg-background-dark text-text-primary dark:text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
                >
                  <option value={1}>1 day before</option>
                  <option value={2}>2 days before</option>
                  <option value={3}>3 days before</option>
                  <option value={5}>5 days before</option>
                  <option value={7}>7 days before</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Browser Notifications */}
          <Card>
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
                <div className="flex-1">
                  <p className="text-text-primary dark:text-white text-sm sm:text-base font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg sm:text-xl">
                      notifications_active
                    </span>
                    Browser Notifications
                  </p>
                  <p className="text-text-secondary text-xs sm:text-sm mt-1">
                    Get pop-up reminders on your device when your period is
                    approaching
                  </p>
                </div>
                {browserNotificationStatus === "granted" && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-[10px] sm:text-xs font-medium self-start">
                    <span className="material-symbols-outlined text-xs sm:text-sm">
                      check_circle
                    </span>
                    Enabled
                  </span>
                )}
              </div>

              {browserNotificationStatus === "unsupported" ? (
                <div className="p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/40">
                  <p className="text-amber-700 dark:text-amber-400 text-xs sm:text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-base sm:text-lg">
                      warning
                    </span>
                    Your browser doesn&apos;t support notifications
                  </p>
                </div>
              ) : browserNotificationStatus === "denied" ? (
                <div className="p-2.5 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/40">
                  <p className="text-red-700 dark:text-red-400 text-xs sm:text-sm">
                    <span className="font-medium">Notifications blocked.</span>{" "}
                    To enable, go to your browser settings and allow
                    notifications for this site.
                  </p>
                </div>
              ) : browserNotificationStatus === "granted" ? (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      showBrowserNotification("Test Notification 🔔", {
                        body: "Great! Your browser notifications are working perfectly. You'll receive period reminders here.",
                      });
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">
                        send
                      </span>
                      Send Test Notification
                    </span>
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={async () => {
                    const permission = await requestNotificationPermission();
                    setBrowserNotificationStatus(permission);
                    if (permission === "granted") {
                      showBrowserNotification("Notifications Enabled! 🎉", {
                        body: "You'll now receive period reminders on this device.",
                      });
                    }
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">
                      notifications
                    </span>
                    Enable Browser Notifications
                  </span>
                </Button>
              )}

              <p className="text-[10px] sm:text-xs text-text-secondary">
                💡 Tip: Browser notifications work when this tab is open. For
                best results, keep SisterCare pinned in your browser.
              </p>
            </div>
          </Card>
        </div>

        {/* Appearance */}
        <h2 className="text-text-primary dark:text-white text-lg sm:text-xl md:text-[22px] font-bold leading-tight tracking-tight pb-2 sm:pb-3 pt-4 sm:pt-5 md:pt-6">
          Appearance
        </h2>

        <Card className="mb-6 sm:mb-7 md:mb-8">
          <div className="flex flex-col gap-2.5 sm:gap-3">
            <p className="text-text-primary dark:text-white text-sm sm:text-base font-bold">
              Theme
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {(["light", "dark", "system"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setTheme(option)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 capitalize transition-all text-sm touch-target ${
                    theme === option
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-gray-200 dark:border-gray-700 text-text-secondary hover:border-primary/50 active:bg-primary/5"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="mb-6 sm:mb-7 md:mb-8">
          <Button onClick={saveSettings} disabled={saving} fullWidth>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        {/* Account Actions */}
        <h2 className="text-text-primary dark:text-white text-lg sm:text-xl md:text-[22px] font-bold leading-tight tracking-tight pb-2 sm:pb-3 pt-4 sm:pt-5 md:pt-6">
          Account
        </h2>

        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-7 md:mb-8">
          <Card>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
              <div>
                <p className="text-text-primary dark:text-white text-sm sm:text-base font-bold">
                  Sign Out
                </p>
                <p className="text-text-secondary text-xs sm:text-sm">
                  Sign out from your account on this device
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={handleSignOut}
                className="w-full sm:w-auto"
              >
                Sign Out
              </Button>
            </div>
          </Card>
        </div>

        {/* Danger Zone */}
        <h2 className="text-red-600 dark:text-red-400 text-lg sm:text-xl md:text-[22px] font-bold leading-tight tracking-tight pb-2 sm:pb-3 pt-4 sm:pt-5 md:pt-6">
          Danger Zone
        </h2>

        <div className="flex flex-col gap-3 sm:gap-4 rounded-lg sm:rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 p-4 sm:p-5">
          <div className="flex flex-col gap-1">
            <p className="text-red-700 dark:text-red-400 text-sm sm:text-base font-bold leading-tight">
              Delete Account
            </p>
            <p className="text-text-secondary text-xs sm:text-sm md:text-base font-normal leading-normal">
              Permanently delete your account and all associated data. This
              action cannot be undone.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={handleDeleteAccount}
              className="!border-red-200 dark:!border-red-900/40 !text-red-600 hover:!bg-red-50 dark:hover:!bg-red-900/20 w-full sm:w-auto text-sm"
            >
              Delete My Account
            </Button>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 sm:mt-16 md:mt-20 border-t border-border-light dark:border-border-dark py-6 sm:py-8 md:py-10 safe-bottom">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 text-primary/60">
              <span className="material-symbols-outlined text-lg sm:text-xl">
                verified_user
              </span>
              <span className="text-xs sm:text-sm font-medium">
                Your data is securely stored
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-text-secondary">
              © 2026 SisterCare. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

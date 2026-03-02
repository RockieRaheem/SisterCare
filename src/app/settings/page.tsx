"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Card from "@/components/ui/Card";
import Toggle from "@/components/ui/Toggle";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { jsPDF } from "jspdf";
import {
  getUserProfile,
  updateUserPreferences,
  updateUserProfile,
  getSymptoms,
  getPendingReminders,
  getCycleHistory,
  getUserConversations,
} from "@/lib/firestore";
import {
  requestNotificationPermission,
  getNotificationPermission,
  showBrowserNotification,
} from "@/lib/notifications";
import { UserPreferences } from "@/types";

export default function SettingsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { language, setLanguage, languages, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Settings state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [reminderDays, setReminderDays] = useState(3);
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

  // Export user health data as PDF
  const handleExportData = async () => {
    if (!user) return;

    setExporting(true);
    setMessage(null);

    try {
      // Fetch all user data
      const [profile, symptoms, reminders, cycleHistory, conversations] =
        await Promise.all([
          getUserProfile(user.uid),
          getSymptoms(user.uid, new Date(0), new Date()), // All symptoms ever
          getPendingReminders(user.uid),
          getCycleHistory(user.uid),
          getUserConversations(user.uid),
        ]);

      // Create PDF document
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPos = 20;

      // Helper function to add new page if needed
      const checkPageBreak = (height: number = 20) => {
        if (yPos + height > 270) {
          pdf.addPage();
          yPos = 20;
        }
      };

      // Title
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(24);
      pdf.setTextColor(140, 48, 232); // Primary purple
      pdf.text("SisterCare", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;

      pdf.setFontSize(14);
      pdf.setTextColor(100, 100, 100);
      pdf.text("Health Data Report", pageWidth / 2, yPos, { align: "center" });
      yPos += 8;

      pdf.setFontSize(10);
      pdf.text(
        `Generated: ${new Date().toLocaleDateString("en-UG", { dateStyle: "full" })}`,
        pageWidth / 2,
        yPos,
        { align: "center" },
      );
      yPos += 15;

      // Horizontal line
      pdf.setDrawColor(140, 48, 232);
      pdf.setLineWidth(0.5);
      pdf.line(20, yPos, pageWidth - 20, yPos);
      yPos += 15;

      // Profile Section
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(50, 50, 50);
      pdf.text("Profile Information", 20, yPos);
      yPos += 10;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Name: ${profile?.displayName || "Not set"}`, 25, yPos);
      yPos += 7;
      pdf.text(`Email: ${profile?.email || "Not set"}`, 25, yPos);
      yPos += 7;
      pdf.text(
        `Account Created: ${profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "Unknown"}`,
        25,
        yPos,
      );
      yPos += 15;

      // Cycle Data Section
      checkPageBreak(60);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(50, 50, 50);
      pdf.text("Menstrual Cycle Data", 20, yPos);
      yPos += 10;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);

      if (profile?.cycleData) {
        const lastPeriod = profile.cycleData.lastPeriodDate
          ? new Date(profile.cycleData.lastPeriodDate).toLocaleDateString()
          : "Not recorded";
        const nextPeriod = profile.cycleData.nextPeriodDate
          ? new Date(profile.cycleData.nextPeriodDate).toLocaleDateString()
          : "Not calculated";

        pdf.text(`Last Period: ${lastPeriod}`, 25, yPos);
        yPos += 7;
        pdf.text(`Next Expected Period: ${nextPeriod}`, 25, yPos);
        yPos += 7;
        pdf.text(
          `Average Cycle Length: ${profile.cycleData.cycleLength || "--"} days`,
          25,
          yPos,
        );
        yPos += 7;
        pdf.text(
          `Average Period Length: ${profile.cycleData.periodLength || "--"} days`,
          25,
          yPos,
        );
        yPos += 7;
        pdf.text(
          `Current Phase: ${profile.cycleData.currentPhase || "Unknown"}`,
          25,
          yPos,
        );
      } else {
        pdf.text(
          "No cycle data recorded yet. Complete onboarding to start tracking.",
          25,
          yPos,
        );
      }
      yPos += 15;

      // Symptoms Section
      checkPageBreak(40);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(50, 50, 50);
      pdf.text(`Symptom Logs (${symptoms.length} entries)`, 20, yPos);
      yPos += 10;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(80, 80, 80);

      if (symptoms.length > 0) {
        // Show last 15 symptoms
        const recentSymptoms = symptoms.slice(0, 15);
        recentSymptoms.forEach((symptom) => {
          checkPageBreak(15);
          const date = symptom.date
            ? new Date(symptom.date).toLocaleDateString()
            : "Unknown date";
          const symptomList = Array.isArray(symptom.symptoms)
            ? symptom.symptoms.join(", ")
            : "None";
          const mood = symptom.mood || "--";
          pdf.text(`• ${date}: ${symptomList} (Mood: ${mood})`, 25, yPos);
          yPos += 6;
        });

        if (symptoms.length > 15) {
          pdf.setFont("helvetica", "italic");
          pdf.text(`... and ${symptoms.length - 15} more entries`, 25, yPos);
          yPos += 6;
        }
      } else {
        pdf.text("No symptoms logged yet.", 25, yPos);
        yPos += 6;
      }
      yPos += 10;

      // Cycle History Section
      checkPageBreak(40);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(50, 50, 50);
      pdf.text(`Cycle History (${cycleHistory.length} cycles)`, 20, yPos);
      yPos += 10;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(80, 80, 80);

      if (cycleHistory.length > 0) {
        const recentCycles = cycleHistory.slice(0, 10);
        recentCycles.forEach((cycle) => {
          checkPageBreak(10);
          const startDate = cycle.startDate
            ? new Date(cycle.startDate).toLocaleDateString()
            : "Unknown";
          const endDate = cycle.endDate
            ? new Date(cycle.endDate).toLocaleDateString()
            : "Ongoing";
          pdf.text(
            `• ${startDate} to ${endDate} (${cycle.cycleLength || "--"} days)`,
            25,
            yPos,
          );
          yPos += 6;
        });
      } else {
        pdf.text("No cycle history recorded yet.", 25, yPos);
        yPos += 6;
      }
      yPos += 10;

      // Reminders Section
      checkPageBreak(30);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(50, 50, 50);
      pdf.text(`Pending Reminders (${reminders.length})`, 20, yPos);
      yPos += 10;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(80, 80, 80);

      if (reminders.length > 0) {
        reminders.slice(0, 5).forEach((reminder) => {
          checkPageBreak(10);
          const date = reminder.scheduledFor
            ? new Date(reminder.scheduledFor).toLocaleDateString()
            : "Unknown";
          pdf.text(`• ${reminder.title || "Reminder"}: ${date}`, 25, yPos);
          yPos += 6;
        });
      } else {
        pdf.text("No pending reminders.", 25, yPos);
        yPos += 6;
      }
      yPos += 15;

      // Summary Stats
      checkPageBreak(40);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(50, 50, 50);
      pdf.text("Summary", 20, yPos);
      yPos += 10;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Total Symptom Logs: ${symptoms.length}`, 25, yPos);
      yPos += 7;
      pdf.text(`Cycles Tracked: ${cycleHistory.length}`, 25, yPos);
      yPos += 7;
      pdf.text(`Chat Conversations: ${conversations.length}`, 25, yPos);
      yPos += 20;

      // Footer
      checkPageBreak(30);
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, yPos, pageWidth - 20, yPos);
      yPos += 10;

      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(120, 120, 120);
      pdf.text(
        "This report was generated by SisterCare - Your trusted women's health companion.",
        pageWidth / 2,
        yPos,
        { align: "center" },
      );
      yPos += 6;
      pdf.text(
        "For medical concerns, please consult a healthcare professional.",
        pageWidth / 2,
        yPos,
        { align: "center" },
      );
      yPos += 6;
      pdf.text(
        "Uganda Emergency: Sauti 116 | Police: 999",
        pageWidth / 2,
        yPos,
        { align: "center" },
      );

      // Save PDF
      pdf.save(
        `SisterCare-Health-Report-${new Date().toISOString().split("T")[0]}.pdf`,
      );

      setMessage({
        type: "success",
        text: "Your health report has been downloaded as PDF!",
      });
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error("Error exporting data:", error);
      setMessage({
        type: "error",
        text: "Failed to export data. Please try again.",
      });
    } finally {
      setExporting(false);
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
              {t.settings.title}
            </h1>
            <p className="text-text-secondary text-sm sm:text-base font-normal leading-normal">
              {language === "lg"
                ? "Tegeka by'oyagala, obumanyiso, n'obukuumi bw'akawunti yo."
                : "Manage your preferences, notifications, and account security."}
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
                <div className="relative inline-flex items-center">
                  <select
                    value={reminderDays}
                    onChange={(e) => setReminderDays(Number(e.target.value))}
                    className="appearance-none min-w-[160px] h-11 pl-4 pr-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-text-primary dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer transition-all hover:border-primary/50"
                  >
                    <option value={1}>1 day before</option>
                    <option value={2}>2 days before</option>
                    <option value={3}>3 days before</option>
                    <option value={5}>5 days before</option>
                    <option value={7}>7 days before</option>
                  </select>
                  <div className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center pointer-events-none">
                    <span className="material-symbols-outlined text-primary text-xl">
                      keyboard_arrow_down
                    </span>
                  </div>
                </div>
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
          {t.settings.preferences}
        </h2>

        <Card className="mb-4 sm:mb-5">
          <div className="flex flex-col gap-2.5 sm:gap-3">
            <p className="text-text-primary dark:text-white text-sm sm:text-base font-bold">
              {t.settings.theme}
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 transition-all text-sm cursor-pointer ${
                  theme === "light"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-gray-200 dark:border-gray-700 text-text-secondary hover:border-primary/50"
                }`}
              >
                {t.settings.lightMode}
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 transition-all text-sm cursor-pointer ${
                  theme === "dark"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-gray-200 dark:border-gray-700 text-text-secondary hover:border-primary/50"
                }`}
              >
                {t.settings.darkMode}
              </button>
              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 transition-all text-sm cursor-pointer ${
                  theme === "system"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-gray-200 dark:border-gray-700 text-text-secondary hover:border-primary/50"
                }`}
              >
                {t.settings.systemMode || "System"}
              </button>
            </div>
          </div>
        </Card>

        {/* Language Selection */}
        <Card className="mb-6 sm:mb-7 md:mb-8">
          <div className="flex flex-col gap-2.5 sm:gap-3">
            <p className="text-text-primary dark:text-white text-sm sm:text-base font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">
                translate
              </span>
              {t.settings.language}
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 transition-all text-sm touch-target flex items-center gap-2 ${
                    language === lang.code
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-gray-200 dark:border-gray-700 text-text-secondary hover:border-primary/50 active:bg-primary/5"
                  }`}
                >
                  <span>{lang.code === "en" ? "🇬🇧" : "🇺🇬"}</span>
                  <span>{lang.nativeName}</span>
                </button>
              ))}
            </div>
            <p className="text-text-secondary text-xs mt-1">
              {language === "lg"
                ? "Oluganda luzze kukozesebwa mu app yonna"
                : "Change the language used throughout the app"}
            </p>
          </div>
        </Card>

        {/* Save Button */}
        <div className="mb-6 sm:mb-7 md:mb-8">
          <Button onClick={saveSettings} disabled={saving} fullWidth>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        {/* Data & Privacy */}
        <h2 className="text-text-primary dark:text-white text-lg sm:text-xl md:text-[22px] font-bold leading-tight tracking-tight pb-2 sm:pb-3 pt-4 sm:pt-5 md:pt-6">
          Data & Privacy
        </h2>

        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-7 md:mb-8">
          <Card>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
              <div>
                <p className="text-text-primary dark:text-white text-sm sm:text-base font-bold">
                  Export Your Health Data
                </p>
                <p className="text-text-secondary text-xs sm:text-sm">
                  Download a beautifully formatted PDF report with all your
                  cycle data, symptoms, and health records.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={handleExportData}
                disabled={exporting}
                className="w-full sm:w-auto"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">
                    {exporting ? "hourglass_empty" : "picture_as_pdf"}
                  </span>
                  {exporting ? "Generating PDF..." : "Download PDF"}
                </span>
              </Button>
            </div>
          </Card>

          <Card>
            <div className="flex flex-col gap-2">
              <p className="text-text-primary dark:text-white text-sm sm:text-base font-bold">
                Your Data Rights
              </p>
              <ul className="text-text-secondary text-xs sm:text-sm space-y-1">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary text-sm mt-0.5">
                    check_circle
                  </span>
                  Your data is stored securely and encrypted
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary text-sm mt-0.5">
                    check_circle
                  </span>
                  We never sell your personal health information
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary text-sm mt-0.5">
                    check_circle
                  </span>
                  You can export or delete your data at any time
                </li>
              </ul>
            </div>
          </Card>
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

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/layout/Header";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Toggle from "@/components/ui/Toggle";
import {
  getUserProfile,
  updateUserProfile,
  updateUserPreferences,
  saveCycleData,
  calculateNextPeriod,
  getCurrentPhase,
  schedulePeriodReminders,
} from "@/lib/firestore";
import { UserProfile, CycleData, UserPreferences } from "@/types";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [lastPeriodDate, setLastPeriodDate] = useState("");
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [reminderDays, setReminderDays] = useState(3);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  // Form validation
  const [errors, setErrors] = useState<{
    displayName?: string;
    lastPeriodDate?: string;
  }>({});

  const formatDateForInput = useCallback((date: Date): string => {
    return date.toISOString().split("T")[0];
  }, []);

  const loadProfile = useCallback(async () => {
    if (!user) return;

    try {
      const userProfile = await getUserProfile(user.uid);
      if (userProfile) {
        setProfile(userProfile);
        setDisplayName(userProfile.displayName || "");

        if (userProfile.cycleData) {
          const lastDate = userProfile.cycleData.lastPeriodDate;
          if (lastDate) {
            setLastPeriodDate(formatDateForInput(lastDate));
          }
          setCycleLength(userProfile.cycleData.cycleLength || 28);
          setPeriodLength(userProfile.cycleData.periodLength || 5);
        }

        if (userProfile.preferences) {
          setReminderDays(userProfile.preferences.reminderDaysBefore || 3);
          setEmailNotifications(
            userProfile.preferences.emailNotifications ?? true,
          );
          setPushNotifications(
            userProfile.preferences.pushNotifications ?? true,
          );
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setMessage({ type: "error", text: "Failed to load profile data" });
    } finally {
      setLoading(false);
    }
  }, [user, formatDateForInput]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }

    if (user && loading) {
      loadProfile();
    }
  }, [user, authLoading, router, loading, loadProfile]);

  // Track changes
  const handleFieldChange = useCallback(() => {
    setHasChanges(true);
    // Clear message when user starts editing
    if (message) setMessage(null);
  }, [message]);

  const validateForm = useCallback((): boolean => {
    const newErrors: { displayName?: string; lastPeriodDate?: string } = {};

    if (displayName && displayName.length > 50) {
      newErrors.displayName = "Name must be less than 50 characters";
    }

    if (lastPeriodDate) {
      const selectedDate = new Date(lastPeriodDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        newErrors.lastPeriodDate = "Date cannot be in the future";
      }

      // Check if date is too far in the past (more than 60 days)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      if (selectedDate < sixtyDaysAgo) {
        newErrors.lastPeriodDate = "Please enter a more recent date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [displayName, lastPeriodDate]);

  const handleSaveProfile = async () => {
    if (!user) return;

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Update display name
      await updateUserProfile(user.uid, { displayName: displayName.trim() });

      // Update cycle data if last period date is provided
      if (lastPeriodDate) {
        const lastDate = new Date(lastPeriodDate);
        const nextDate = calculateNextPeriod(lastDate, cycleLength);
        const { phase } = getCurrentPhase(lastDate, cycleLength, periodLength);

        const cycleData: Partial<CycleData> = {
          lastPeriodDate: lastDate,
          cycleLength,
          periodLength,
          nextPeriodDate: nextDate,
          currentPhase: phase as CycleData["currentPhase"],
        };

        await saveCycleData(user.uid, cycleData);

        // Schedule reminders
        await schedulePeriodReminders(user.uid, nextDate, reminderDays);
      }

      // Update preferences
      const preferences: Partial<UserPreferences> = {
        emailNotifications,
        pushNotifications,
        reminderDaysBefore: reminderDays,
      };
      await updateUserPreferences(user.uid, preferences);

      setMessage({ type: "success", text: "Profile updated successfully! 🎉" });
      setHasChanges(false);

      // Reload profile to get fresh data
      await loadProfile();
    } catch (error) {
      console.error("Error saving profile:", error);
      setMessage({
        type: "error",
        text: "Failed to save profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
      <Header variant="app" />

      <main className="flex-1 max-w-[800px] mx-auto w-full px-4 md:px-8 py-8 pb-24 md:pb-8">
        {/* Page Header */}
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-text-primary dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-tight">
            Your Profile
          </h1>
          <p className="text-text-secondary text-base">
            Manage your personal information and cycle settings for accurate
            predictions.
          </p>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl border ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">
                {message.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Personal Information */}
        <section className="mb-8">
          <h2 className="text-text-primary dark:text-white text-xl font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              person
            </span>
            Personal Information
          </h2>
          <Card>
            <div className="space-y-4">
              <div>
                <Input
                  label="Display Name"
                  type="text"
                  placeholder="How should we call you?"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    handleFieldChange();
                    if (errors.displayName)
                      setErrors((prev) => ({
                        ...prev,
                        displayName: undefined,
                      }));
                  }}
                  maxLength={50}
                />
                {errors.displayName && (
                  <p className="mt-1 text-red-500 text-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">
                      error
                    </span>
                    {errors.displayName}
                  </p>
                )}
                <p className="text-xs text-text-secondary mt-1">
                  {displayName.length}/50 characters
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-text-primary dark:text-white text-sm font-semibold">
                  Email Address
                </label>
                <div className="px-4 py-3 bg-background-light dark:bg-background-dark rounded-xl border border-border-light dark:border-border-dark text-text-secondary flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">
                    email
                  </span>
                  {user?.email}
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Email cannot be changed here
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* Cycle Information */}
        <section className="mb-8">
          <h2 className="text-text-primary dark:text-white text-xl font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              calendar_month
            </span>
            Cycle Information
          </h2>
          <Card>
            <div className="space-y-6">
              <div>
                <Input
                  label="Last Period Start Date"
                  type="date"
                  value={lastPeriodDate}
                  onChange={(e) => {
                    setLastPeriodDate(e.target.value);
                    handleFieldChange();
                    if (errors.lastPeriodDate)
                      setErrors((prev) => ({
                        ...prev,
                        lastPeriodDate: undefined,
                      }));
                  }}
                  max={new Date().toISOString().split("T")[0]}
                />
                {errors.lastPeriodDate && (
                  <p className="mt-1 text-red-500 text-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">
                      error
                    </span>
                    {errors.lastPeriodDate}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-text-primary dark:text-white text-sm font-semibold">
                  Average Cycle Length: {cycleLength} days
                </label>
                <input
                  type="range"
                  min="21"
                  max="40"
                  value={cycleLength}
                  onChange={(e) => {
                    setCycleLength(Number(e.target.value));
                    handleFieldChange();
                  }}
                  className="w-full h-2 bg-border-light dark:bg-border-dark rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>21 days</span>
                  <span>28 days (typical)</span>
                  <span>40 days</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-text-primary dark:text-white text-sm font-semibold">
                  Average Period Length: {periodLength} days
                </label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={periodLength}
                  onChange={(e) => {
                    setPeriodLength(Number(e.target.value));
                    handleFieldChange();
                  }}
                  className="w-full h-2 bg-border-light dark:bg-border-dark rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>2 days</span>
                  <span>5 days (typical)</span>
                  <span>10 days</span>
                </div>
              </div>

              {/* Cycle Preview */}
              {lastPeriodDate && (
                <div className="mt-6 p-4 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20">
                  <h3 className="text-primary font-bold mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined">insights</span>
                    Cycle Preview
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-text-secondary">
                        Next Period Expected
                      </p>
                      <p className="text-text-primary dark:text-white font-semibold">
                        {calculateNextPeriod(
                          new Date(lastPeriodDate),
                          cycleLength,
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-secondary">Current Phase</p>
                      <p className="text-text-primary dark:text-white font-semibold capitalize">
                        {
                          getCurrentPhase(
                            new Date(lastPeriodDate),
                            cycleLength,
                            periodLength,
                          ).phase
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-text-secondary">Day in Cycle</p>
                      <p className="text-text-primary dark:text-white font-semibold">
                        Day{" "}
                        {
                          getCurrentPhase(
                            new Date(lastPeriodDate),
                            cycleLength,
                            periodLength,
                          ).dayInCycle
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-text-secondary">Days Until Period</p>
                      <p className="text-text-primary dark:text-white font-semibold">
                        {
                          getCurrentPhase(
                            new Date(lastPeriodDate),
                            cycleLength,
                            periodLength,
                          ).daysUntilNextPeriod
                        }{" "}
                        days
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* Notification Preferences */}
        <section className="mb-8">
          <h2 className="text-text-primary dark:text-white text-xl font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              notifications
            </span>
            Reminder Settings
          </h2>
          <Card>
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-text-primary dark:text-white text-sm font-semibold">
                  Remind me {reminderDays} day{reminderDays !== 1 ? "s" : ""}{" "}
                  before my period
                </label>
                <input
                  type="range"
                  min="1"
                  max="7"
                  value={reminderDays}
                  onChange={(e) => setReminderDays(Number(e.target.value))}
                  className="w-full h-2 bg-border-light dark:bg-border-dark rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>1 day</span>
                  <span>3 days</span>
                  <span>7 days</span>
                </div>
              </div>

              <div className="border-t border-border-light dark:border-border-dark pt-4">
                <Toggle
                  checked={emailNotifications}
                  onChange={setEmailNotifications}
                  label="Email Notifications"
                  description="Receive cycle predictions and health tips via email"
                />
              </div>

              <Toggle
                checked={pushNotifications}
                onChange={setPushNotifications}
                label="Push Notifications"
                description="Get real-time alerts for reminders and check-ins"
              />
            </div>
          </Card>
        </section>

        {/* Save Button */}
        <div className="flex justify-end gap-4 items-center">
          {hasChanges && (
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">edit</span>
              Unsaved changes
            </span>
          )}
          <Button variant="secondary" onClick={() => router.push("/dashboard")}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveProfile}
            disabled={saving || !hasChanges}
            icon={saving ? undefined : "save"}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PeriodReminderBanner from "@/components/ui/PeriodReminderBanner";
import { AppShellSkeleton } from "@/components/ui/Skeleton";
import Link from "next/link";
import {
  getUserProfile,
  logSymptoms,
  getCurrentPhase,
  getCycleInfo,
} from "@/lib/dataClient";
import { UserProfile, MoodType } from "@/types";
import { auth } from "@/lib/authClient";

const phaseColors: Record<string, string> = {
  menstrual: "text-red-500",
  follicular: "text-green-500",
  ovulation: "text-amber-500",
  luteal: "text-purple-500",
};

export default function DashboardPage() {
  const {
    user,
    userProfile: authProfile,
    loading: authLoading,
    refreshProfile,
  } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [moodLogged, setMoodLogged] = useState(false);
  const [moodLogging, setMoodLogging] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [dismissedPeriodBanner, setDismissedPeriodBanner] = useState(false);
  const [cycleInfo, setCycleInfo] = useState<{
    phase: string;
    dayInCycle: number;
    daysUntilNextPeriod: number;
    nextPeriodDate: Date;
    isInPeriod: boolean;
    isPeriodLate: boolean;
    daysLate: number;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [workspaceChecked, setWorkspaceChecked] = useState(false);

  // Update time every minute for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Handle auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  // Counsellors and applicants have their own workspace; they must never be
  // routed into member cycle onboarding or the member dashboard.
  useEffect(() => {
    if (authLoading || !user) return;
    const resolveWorkspace = async () => {
      try {
        const role = (await auth.currentUser?.getIdTokenResult())?.claims.role;
        if (role === "admin") { router.replace("/admin"); return; }
        if (role === "counsellor") { router.replace("/counsellor"); return; }
        if (authProfile?.registrationIntent === "counsellor") { router.replace("/counsellor/apply"); return; }
      } finally {
        setWorkspaceChecked(true);
      }
    };
    resolveWorkspace();
  }, [authLoading, authProfile?.registrationIntent, router, user]);

  // Check onboarding status FIRST before loading dashboard
  useEffect(() => {
    const checkOnboarding = async () => {
      if (authLoading || !user || !workspaceChecked) return;

      try {
        const userProfile = await getUserProfile(user.uid);

        if (userProfile?.registrationIntent === "counsellor") {
          router.replace("/counsellor/apply");
          return;
        }
        // Redirect to onboarding if not completed - do this BEFORE showing dashboard
        if (!userProfile || !userProfile.onboardingCompleted) {
          router.replace("/onboarding");
          return;
        }

        // Only mark as checked if onboarding is complete
        setOnboardingChecked(true);
      } catch (err: unknown) {
        const supabaseError = err as { code?: string; message?: string };
        console.error("Error checking onboarding:", err);

        // Check if it's a permission error
        const isPermissionError =
          supabaseError.message?.includes("permission") ||
          supabaseError.code === "permission-denied";

        if (isPermissionError) {
          // If permission error but user is authenticated, use authProfile or allow access
          if (authProfile?.onboardingCompleted) {
            setOnboardingChecked(true);
          } else {
            // Show dashboard anyway - user can use it without Supabase temporarily
            setOnboardingChecked(true);
          }
        } else {
          // On other errors, redirect to onboarding to be safe
          router.replace("/onboarding");
        }
      }
    };

    checkOnboarding();
  }, [user, authLoading, router, authProfile, workspaceChecked]);

  // Restore dismissed period banner state from localStorage
  useEffect(() => {
    try {
      const val = localStorage.getItem("sc_dismissed_period_banner");
      if (val === "true") setDismissedPeriodBanner(true);
    } catch {}
  }, []);

  const handleDismissPeriodBanner = () => {
    setDismissedPeriodBanner(true);
    try {
      localStorage.setItem("sc_dismissed_period_banner", "true");
    } catch {}
  };

  // Load dashboard data only AFTER onboarding is verified
  useEffect(() => {
    if (user && !authLoading && onboardingChecked) {
      loadDashboardData();
    }
  }, [user, authLoading, onboardingChecked]);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    setError(null);
    try {
      const userProfile = await getUserProfile(user.uid);
      setProfile(userProfile);

      // Calculate cycle info if we have cycle data
      if (userProfile?.cycleData) {
        const { lastPeriodDate, cycleLength, periodLength } =
          userProfile.cycleData;
        if (lastPeriodDate && cycleLength && periodLength) {
          const info = getCycleInfo(lastPeriodDate, cycleLength, periodLength);
          setCycleInfo(info);
        }
      }
    } catch (err: unknown) {
      const supabaseError = err as { code?: string; message?: string };
      console.error("Error loading dashboard data:", err);

      // Check if it's a permission error
      const isPermissionError =
        supabaseError.message?.includes("permission") ||
        supabaseError.code === "permission-denied";

      if (isPermissionError) {
        // Use authProfile if available
        if (authProfile) {
          setProfile(authProfile);
          if (authProfile.cycleData) {
            const { lastPeriodDate, cycleLength, periodLength } =
              authProfile.cycleData;
            if (lastPeriodDate && cycleLength && periodLength) {
              const info = getCycleInfo(
                lastPeriodDate,
                cycleLength,
                periodLength,
              );
              setCycleInfo(info);
            }
          }
        }
        setError("Cloud sync unavailable. Some features may be limited.");
      } else {
        setError("Unable to load your dashboard. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [user, authProfile]);

  const handleMoodSelect = async (mood: MoodType) => {
    if (moodLogging) return;

    setSelectedMood(mood);
    setMoodLogging(true);

    if (!user) {
      setMoodLogging(false);
      return;
    }

    try {
      await logSymptoms(user.uid, {
        date: new Date(),
        mood,
        symptoms: [],
        notes: "",
      });
      setMoodLogged(true);

      // Reset after 3 seconds
      setTimeout(() => {
        setMoodLogged(false);
        setSelectedMood(null);
      }, 3000);
    } catch (err: unknown) {
      const supabaseError = err as { code?: string; message?: string };
      console.error("Error logging mood:", err);

      // For permission errors, still show success locally
      const isPermissionError =
        supabaseError.message?.includes("permission") ||
        supabaseError.code === "permission-denied";

      if (isPermissionError) {
        // Show success locally even if couldn't save to cloud
        setMoodLogged(true);
        setTimeout(() => {
          setMoodLogged(false);
          setSelectedMood(null);
        }, 3000);
      } else {
        setSelectedMood(null);
      }
    } finally {
      setMoodLogging(false);
    }
  };

  // Calculate countdown timer values with memoization
  // Uses the corrected nextPeriodDate from getCycleInfo
  const countdown = useMemo(() => {
    if (!cycleInfo) {
      return { days: 0, hours: 0, minutes: 0, isPeriodActive: false };
    }

    const now = currentTime;
    const nextPeriod = cycleInfo.nextPeriodDate;
    const diff = nextPeriod.getTime() - now.getTime();

    // Check if user is currently in their period
    const isPeriodActive = cycleInfo.isInPeriod;

    const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    const hours = Math.max(
      0,
      Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    );
    const minutes = Math.max(
      0,
      Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    );

    return { days, hours, minutes, isPeriodActive, nextPeriodDate: nextPeriod };
  }, [cycleInfo, currentTime]);

  // Get current phase info with translations
  const currentPhaseInfo = useMemo(() => {
    const phase = cycleInfo?.phase || "follicular";
    const phaseKey = phase as
      | "menstrual"
      | "follicular"
      | "ovulation"
      | "luteal";
    return {
      color: phaseColors[phase] || phaseColors.follicular,
      title: t.dashboard.phaseTitles[phaseKey],
      tip: t.dashboard.phaseTips[phaseKey],
    };
  }, [cycleInfo, t]);

  // Moods with translations
  const moods: { emoji: string; label: string; value: MoodType }[] = useMemo(
    () => [
      { emoji: "😊", label: t.dashboard.moods.good, value: "good" },
      { emoji: "😴", label: t.dashboard.moods.tired, value: "okay" },
      { emoji: "😔", label: t.dashboard.moods.low, value: "low" },
      { emoji: "🤩", label: t.dashboard.moods.great, value: "great" },
    ],
    [t],
  );

  // Show loading while checking auth OR onboarding status OR loading data
  if (authLoading || !workspaceChecked || !onboardingChecked || loading) {
    return <AppShellSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <span className="material-symbols-outlined text-red-500 text-5xl">
            error
          </span>
          <p className="text-text-primary dark:text-white font-semibold">
            {error}
          </p>
          <Button onClick={() => loadDashboardData()}>
            {t.dashboard.tryAgain}
          </Button>
        </div>
      </div>
    );
  }

  const displayName =
    profile?.displayName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Sister";

  // Date formatting based on language
  const dateLocale = language === "lg" ? "en-US" : "en-US"; // Luganda uses English date names for now
  const pregnancy = profile?.pregnancyData;

  // Pregnancy is a distinct tracking mode. Do not leave period countdowns or
  // late-period prompts visible once pregnancy support has been confirmed.
  if (pregnancy?.isPregnant) {
    const dueDate = pregnancy.estimatedDueDate;
    const weeks = pregnancy.weeksPregnant;
    const trimester = pregnancy.trimester;
    return (
      <div className="app-page flex min-h-screen flex-col">
        <Header variant="app" />
        <main className="main-content page-container flex-1 py-5 sm:py-8">
          <div className="mb-7 flex flex-col gap-2 sm:mb-9">
            <span className="eyebrow">Pregnancy support</span>
            <h1 className="page-title text-3xl dark:text-white sm:text-4xl">
              Your pregnancy journey, {displayName}
            </h1>
            <p className="max-w-2xl text-text-secondary dark:text-gray-300">
              Your dashboard is now tailored for pregnancy support. Period tracking and period reminders are paused.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3 lg:gap-7">
            <Card padding="lg" className="relative overflow-hidden border-primary/15 bg-white dark:bg-card-dark lg:col-span-2">
              <span className="mb-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                {trimester ? `${trimester[0].toUpperCase()}${trimester.slice(1)} trimester` : "Pregnancy support active"}
              </span>
              <h2 className="text-2xl font-bold text-text-primary dark:text-white">
                {typeof weeks === "number" ? `${weeks} weeks pregnant` : "Your pregnancy support is ready"}
              </h2>
              <p className="mt-3 max-w-xl text-text-secondary dark:text-gray-300">
                Keep up with antenatal care, rest, hydration, and any changes in how you feel. SisterCare will use pregnancy-aware guidance from here.
              </p>
              {dueDate && (
                <div className="mt-6 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                  <p className="text-sm font-medium text-text-secondary dark:text-gray-300">Estimated due date</p>
                  <p className="mt-1 text-lg font-bold text-primary">
                    {dueDate.toLocaleDateString(dateLocale, { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              )}
            </Card>

            <Card className="border-primary/10 bg-white dark:bg-card-dark">
              <h2 className="text-lg font-bold text-text-primary dark:text-white">Next steps</h2>
              <ul className="mt-4 space-y-3 text-sm text-text-secondary dark:text-gray-300">
                <li>Arrange or continue antenatal care.</li>
                <li>Use chat to log symptoms or ask pregnancy questions.</li>
                <li>Seek urgent care for severe pain, heavy bleeding, or worrying symptoms.</li>
              </ul>
              <Link href="/chat" className="mt-6 block">
                <Button fullWidth icon="chat_bubble">Talk to Sister</Button>
              </Link>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="app-page flex min-h-screen flex-col">
      <Header variant="app" />

      <main className="main-content page-container flex-1 py-5 sm:py-8">
        {/* Period Reminder Banner */}
        {cycleInfo && (
          <div className="mb-6">
            <PeriodReminderBanner
              daysUntilPeriod={cycleInfo.daysUntilNextPeriod}
              userName={displayName}
              userId={user?.uid}
              reminderDaysBefore={profile?.preferences?.reminderDaysBefore || 3}
            />
          </div>
        )}

        {/* Late Period Update Reminder */}
        {cycleInfo?.isPeriodLate && !dismissedPeriodBanner && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl relative">
            <button
              onClick={handleDismissPeriodBanner}
              className="absolute top-3 right-3 text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 transition-colors"
              aria-label="Dismiss"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-500 text-2xl">
                update
              </span>
              <div className="flex-1">
                <h3 className="text-amber-800 dark:text-amber-200 font-bold mb-1">
                  {t.dashboard.periodUpdateNeeded}
                </h3>
                <p className="text-amber-700 dark:text-amber-300 text-sm mb-3">
                  {t.dashboard.periodUpdateDesc.replace(
                    "{days}",
                    String(cycleInfo.daysLate),
                  )}
                </p>
                <div className="flex gap-2">
                  <Link href="/profile">
                    <Button variant="secondary" size="sm" icon="edit_calendar">
                      {t.dashboard.updatePeriodDate}
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismissPeriodBanner}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Page Heading */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-col gap-1">
            <span className="eyebrow mb-1">{t.dashboard.healthAtGlance}</span>
            <h1 className="page-title text-3xl dark:text-white sm:text-4xl">
              {t.dashboard.welcomeBack}, {displayName}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-0">
            <Link href="/profile" className="flex-1 sm:flex-none">
              <Button
                variant="secondary"
                icon="person"
                className="w-full sm:w-auto"
              >
                {t.nav.profile}
              </Button>
            </Link>
            <Link href="/chat" className="flex-1 sm:flex-none">
              <Button icon="chat_bubble" className="w-full sm:w-auto">
                {t.nav.chat}
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {/* Main Tracking Column */}
          <div className="lg:col-span-2 space-y-5 sm:space-y-6 lg:space-y-8">
            {/* Timer & Status Section */}
            <Card padding="lg" className="relative overflow-hidden border-primary/15 bg-white dark:bg-card-dark">
              <div className="flex flex-col items-center text-center">
                <span
                  className={`bg-primary/10 ${currentPhaseInfo.color} px-4 py-1 rounded-full text-sm font-bold mb-4 uppercase tracking-wider`}
                >
                  {t.dashboard.currentPhase}:{" "}
                  {cycleInfo?.phase
                    ? t.dashboard.cyclePhases[
                        cycleInfo.phase as keyof typeof t.dashboard.cyclePhases
                      ]
                    : "Unknown"}
                </span>

                {/* Period-specific messaging */}
                {countdown.isPeriodActive ? (
                  <div className="mb-6">
                    <h2 className="text-text-primary dark:text-white text-2xl font-bold mb-2">
                      💜 {t.dashboard.takeItEasy}
                    </h2>
                    <p className="text-text-secondary text-base max-w-md">
                      {t.dashboard.periodDayMessage.replace(
                        "{day}",
                        String(cycleInfo?.dayInCycle || 1),
                      )}
                    </p>
                  </div>
                ) : (
                  <h2 className="text-text-primary dark:text-white text-2xl font-bold mb-6">
                    {t.dashboard.daysUntilNextPeriod}
                  </h2>
                )}

                {/* Timer Component */}
                {countdown.isPeriodActive && (
                  <p className="text-text-secondary text-xs sm:text-sm mb-3">
                    {t.dashboard.timeUntilNextCycle}
                  </p>
                )}
                <div className="flex gap-2 sm:gap-4 w-full max-w-sm sm:max-w-md mx-auto">
                  <div className="flex grow basis-0 flex-col items-stretch gap-1 sm:gap-2">
                    <div className="flex h-16 items-center justify-center rounded-[16px] border border-primary/10 bg-white shadow-soft dark:bg-background-dark sm:h-20">
                      <p className="text-primary text-xl sm:text-2xl font-black">
                        {String(countdown.days).padStart(2, "0")}
                      </p>
                    </div>
                    <p className="text-text-secondary text-[10px] sm:text-xs font-bold uppercase">
                      {t.dashboard.timeUnits.days}
                    </p>
                  </div>
                  <div className="flex grow basis-0 flex-col items-stretch gap-1 sm:gap-2">
                    <div className="flex h-16 items-center justify-center rounded-[16px] border border-border-light bg-white shadow-soft dark:border-border-dark dark:bg-background-dark sm:h-20">
                      <p className="text-text-primary dark:text-white text-xl sm:text-2xl font-black">
                        {String(countdown.hours).padStart(2, "0")}
                      </p>
                    </div>
                    <p className="text-text-secondary text-[10px] sm:text-xs font-bold uppercase">
                      {t.dashboard.timeUnits.hours}
                    </p>
                  </div>
                  <div className="flex grow basis-0 flex-col items-stretch gap-1 sm:gap-2">
                    <div className="flex h-16 items-center justify-center rounded-[16px] border border-border-light bg-white shadow-soft dark:border-border-dark dark:bg-background-dark sm:h-20">
                      <p className="text-text-primary dark:text-white text-xl sm:text-2xl font-black">
                        {String(countdown.minutes).padStart(2, "0")}
                      </p>
                    </div>
                    <p className="text-text-secondary text-[10px] sm:text-xs font-bold uppercase">
                      {t.dashboard.timeUnits.mins}
                    </p>
                  </div>
                </div>

                {cycleInfo?.nextPeriodDate && (
                  <p className="text-text-secondary text-base font-medium mt-6">
                    {countdown.isPeriodActive
                      ? t.dashboard.periodWillLast.replace(
                          "{days}",
                          String(profile?.cycleData?.periodLength || 5),
                        )
                      : t.dashboard.nextPeriodExpected}{" "}
                    {cycleInfo.nextPeriodDate.toLocaleDateString(dateLocale, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}

                {/* Self-care tip during menstruation */}
                {countdown.isPeriodActive && (
                  <div className="mt-4 p-4 bg-pink-50 dark:bg-pink-900/20 rounded-xl border border-pink-200 dark:border-pink-800 max-w-md">
                    <p className="text-pink-700 dark:text-pink-300 text-sm flex items-start gap-2">
                      <span className="material-symbols-outlined text-pink-500 flex-shrink-0">
                        self_care
                      </span>
                      <span>
                        {cycleInfo?.dayInCycle === 1 &&
                          t.dashboard.periodTips.day1}
                        {cycleInfo?.dayInCycle === 2 &&
                          t.dashboard.periodTips.day2}
                        {cycleInfo?.dayInCycle === 3 &&
                          t.dashboard.periodTips.day3}
                        {cycleInfo?.dayInCycle === 4 &&
                          t.dashboard.periodTips.day4}
                        {(cycleInfo?.dayInCycle || 0) >= 5 &&
                          t.dashboard.periodTips.almostThere}
                      </span>
                    </p>
                  </div>
                )}

                {/* Progress bar - shows period progress during menstruation, cycle progress otherwise */}
                {cycleInfo && profile?.cycleData?.cycleLength && (
                  <div className="w-full mt-6">
                    {countdown.isPeriodActive ? (
                      <>
                        <div className="flex justify-between text-xs text-text-secondary mb-2">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-pink-500">
                              water_drop
                            </span>
                            {t.dashboard.periodDay} {cycleInfo.dayInCycle}
                          </span>
                          <span>
                            ~{profile.cycleData.periodLength || 5} {t.time.days}
                          </span>
                        </div>
                        <div className="w-full bg-pink-100 dark:bg-pink-900/30 h-3 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{
                              width: `${Math.min((cycleInfo.dayInCycle / (profile.cycleData.periodLength || 5)) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-pink-500 dark:text-pink-400 mt-1 text-center">
                          {cycleInfo.dayInCycle >=
                          (profile.cycleData.periodLength || 5)
                            ? t.dashboard.periodEndingSoon
                            : t.dashboard.daysRemaining.replace(
                                "{days}",
                                String(
                                  (profile.cycleData.periodLength || 5) -
                                    cycleInfo.dayInCycle,
                                ),
                              )}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between text-xs text-text-secondary mb-2">
                          <span>
                            {t.time.day} {cycleInfo.dayInCycle}
                          </span>
                          <span>
                            {t.time.day} {profile.cycleData.cycleLength}
                          </span>
                        </div>
                        <div className="w-full bg-border-light dark:bg-border-dark h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full transition-all"
                            style={{
                              width: `${(cycleInfo.dayInCycle / profile.cycleData.cycleLength) * 100}%`,
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Daily Check-in */}
            <Card>
              <h2 className="text-text-primary dark:text-white text-xl font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  edit_note
                </span>
                {t.dashboard.dailyCheckin}
              </h2>

              {moodLogged ? (
                <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 text-center">
                  <span className="material-symbols-outlined text-green-500 text-4xl mb-2">
                    check_circle
                  </span>
                  <p className="text-green-700 dark:text-green-400 font-semibold">
                    {t.dashboard.moodLoggedSuccess}
                  </p>
                  <p className="text-green-600 dark:text-green-500 text-sm">
                    {t.dashboard.thankYouCheckin}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-text-secondary mb-4">
                    {t.dashboard.welcomeMessage}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {moods.map((mood) => (
                      <button
                        key={mood.label}
                        onClick={() => handleMoodSelect(mood.value)}
                        className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                          selectedMood === mood.value
                            ? "border-primary bg-primary/10"
                            : "border-transparent bg-background-light dark:bg-background-dark hover:border-primary"
                        }`}
                      >
                        <span className="text-3xl">{mood.emoji}</span>
                        <span className="text-sm font-semibold">
                          {mood.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-6">
                    <Link href="/profile">
                      <Button variant="secondary" fullWidth>
                        {t.dashboard.logDetailedSymptoms}
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </Card>

            {/* No Cycle Data Warning */}
            {!profile?.cycleData && (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">
                      warning
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-amber-800 dark:text-amber-300 font-bold mb-1">
                      {t.dashboard.completeProfile}
                    </h3>
                    <p className="text-amber-700 dark:text-amber-400 text-sm mb-4">
                      {t.dashboard.completeProfileDesc}
                    </p>
                    <Link href="/onboarding">
                      <Button>{t.dashboard.completeSetup}</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Side Column */}
          <div className="space-y-5 sm:space-y-6 lg:space-y-8">
            {/* Daily Tip Card */}
            <div className="surface group relative overflow-hidden border-primary/15 bg-primary/5 p-6 dark:bg-primary/10">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-primary">
                    lightbulb
                  </span>
                  <span className="text-primary font-bold uppercase text-xs tracking-widest">
                    {t.dashboard.dailyTip}
                  </span>
                </div>
                <h3 className="text-text-primary dark:text-white text-lg font-bold mb-2">
                  {currentPhaseInfo.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {currentPhaseInfo.tip}
                </p>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-8xl">spa</span>
              </div>
            </div>

            {/* Quick Actions */}
            <Card>
              <h3 className="text-text-primary dark:text-white font-bold mb-4">
                {t.dashboard.quickActions}
              </h3>
              <div className="space-y-3">
                <Link href="/analytics" className="block">
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-background-light dark:bg-background-dark hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <span className="material-symbols-outlined text-primary">
                        analytics
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      {t.dashboard.viewAnalytics}
                    </span>
                  </button>
                </Link>
                <Link href="/chat" className="block">
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-background-light dark:bg-background-dark hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <span className="material-symbols-outlined text-primary">
                        chat
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      {t.dashboard.talkToSister}
                    </span>
                  </button>
                </Link>
                <Link href="/library" className="block">
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-background-light dark:bg-background-dark hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <span className="material-symbols-outlined text-primary">
                        menu_book
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      {t.dashboard.healthLibrary}
                    </span>
                  </button>
                </Link>
                <Link href="/profile" className="block">
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-background-light dark:bg-background-dark hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <span className="material-symbols-outlined text-primary">
                        calendar_month
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      {t.dashboard.updateCycleData}
                    </span>
                  </button>
                </Link>
              </div>
            </Card>

            {/* Support Card */}
            <div className="bg-primary p-6 rounded-2xl text-white shadow-primary-lg">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined">support_agent</span>
                <span className="font-bold uppercase text-xs tracking-widest">
                  {t.dashboard.needSupport}
                </span>
              </div>
              <p className="text-sm mb-4 opacity-90">
                {t.dashboard.supportMessage}
              </p>
              <Link href="/chat">
                <button className="w-full bg-white text-primary py-2 rounded-lg font-bold text-sm hover:bg-white/90 transition-colors">
                  {t.dashboard.startChatting}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer variant="app" />
    </div>
  );
}

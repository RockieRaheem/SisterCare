"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PeriodReminderBanner from "@/components/ui/PeriodReminderBanner";
import Link from "next/link";
import { getUserProfile, logSymptoms, getCurrentPhase, getCycleInfo } from "@/lib/firestore";
import { UserProfile, MoodType } from "@/types";

const moods: { emoji: string; label: string; value: MoodType }[] = [
  { emoji: "😊", label: "Good", value: "good" },
  { emoji: "😴", label: "Tired", value: "okay" },
  { emoji: "😔", label: "Low", value: "low" },
  { emoji: "🤩", label: "Great", value: "great" },
];

const phaseInfo: Record<string, { color: string; tip: string; title: string }> =
  {
    menstrual: {
      color: "text-red-500",
      title: "Rest and Nurture",
      tip: "Your body is shedding its lining. Focus on rest, gentle movement, and iron-rich foods. It's okay to take it easy.",
    },
    follicular: {
      color: "text-green-500",
      title: "Energy Rising",
      tip: "Estrogen is rising! Great time for creative projects, learning new things, and social activities. Energy levels are increasing.",
    },
    ovulation: {
      color: "text-amber-500",
      title: "Peak Energy",
      tip: "You're at peak energy and fertility. Communication skills are enhanced. Great time for important conversations and presentations.",
    },
    luteal: {
      color: "text-purple-500",
      title: "Wind Down",
      tip: "Progesterone rises, preparing for potential pregnancy. Focus on completing tasks, self-care, and preparing for your upcoming period.",
    },
  };

export default function DashboardPage() {
  const {
    user,
    userProfile: authProfile,
    loading: authLoading,
    refreshProfile,
  } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [moodLogged, setMoodLogged] = useState(false);
  const [moodLogging, setMoodLogging] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
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

  // Check onboarding status FIRST before loading dashboard
  useEffect(() => {
    const checkOnboarding = async () => {
      if (authLoading || !user) return;

      try {
        const userProfile = await getUserProfile(user.uid);

        // Redirect to onboarding if not completed - do this BEFORE showing dashboard
        if (!userProfile || !userProfile.onboardingCompleted) {
          router.replace("/onboarding");
          return;
        }

        // Only mark as checked if onboarding is complete
        setOnboardingChecked(true);
      } catch (err) {
        console.error("Error checking onboarding:", err);
        // On error, redirect to onboarding to be safe
        router.replace("/onboarding");
      }
    };

    checkOnboarding();
  }, [user, authLoading, router]);

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
          const info = getCycleInfo(
            lastPeriodDate,
            cycleLength,
            periodLength,
          );
          setCycleInfo(info);
        }
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError("Unable to load your dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user, router]);

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
    } catch (err) {
      console.error("Error logging mood:", err);
      setSelectedMood(null);
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
    const hours = Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
    const minutes = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));

    return { days, hours, minutes, isPeriodActive, nextPeriodDate: nextPeriod };
  }, [cycleInfo, currentTime]);

  const currentPhaseInfo = useMemo(() => {
    return cycleInfo ? phaseInfo[cycleInfo.phase] : phaseInfo.follicular;
  }, [cycleInfo]);

  // Show loading while checking auth OR onboarding status OR loading data
  if (authLoading || !onboardingChecked || loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary">
            {!onboardingChecked
              ? "Checking your profile..."
              : "Loading your dashboard..."}
          </p>
        </div>
      </div>
    );
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
          <Button onClick={() => loadDashboardData()}>Try Again</Button>
        </div>
      </div>
    );
  }

  const displayName =
    profile?.displayName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Sister";

  return (
    <div className="layout-container flex flex-col min-h-screen">
      <Header variant="app" />

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-8 pb-24 md:pb-8">
        {/* Period Reminder Banner */}
        {cycleInfo && (
          <div className="mb-6">
            <PeriodReminderBanner
              daysUntilPeriod={countdown.days}
              userName={displayName}
              userId={user?.uid}
              reminderDaysBefore={profile?.preferences?.reminderDaysBefore || 3}
            />
          </div>
        )}
        
        {/* Late Period Update Reminder */}
        {cycleInfo?.isPeriodLate && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-500 text-2xl">update</span>
              <div className="flex-1">
                <h3 className="text-amber-800 dark:text-amber-200 font-bold mb-1">
                  Period Update Needed
                </h3>
                <p className="text-amber-700 dark:text-amber-300 text-sm mb-3">
                  Your period was expected {cycleInfo.daysLate} day{cycleInfo.daysLate !== 1 ? "s" : ""} ago. 
                  Please update when your period started for accurate tracking.
                </p>
                <Link href="/profile">
                  <Button variant="secondary" size="sm" icon="edit_calendar">
                    Update Period Date
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Page Heading */}
        <div className="flex flex-wrap justify-between gap-3 mb-8">
          <div className="flex min-w-72 flex-col gap-1">
            <p className="text-text-primary dark:text-white text-4xl font-black leading-tight tracking-tight">
              Welcome back, {displayName}
            </p>
            <p className="text-text-secondary text-lg font-normal leading-normal">
              Your health and emotional well-being at a glance.
            </p>
          </div>
          <div className="flex items-end gap-3">
            <Link href="/profile">
              <Button variant="secondary" icon="person">
                Profile
              </Button>
            </Link>
            <Link href="/chat">
              <Button icon="chat_bubble">Support Chat</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Tracking Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Timer & Status Section */}
            <Card padding="lg">
              <div className="flex flex-col items-center text-center">
                <span
                  className={`bg-primary/10 ${currentPhaseInfo.color} px-4 py-1 rounded-full text-sm font-bold mb-4 uppercase tracking-wider`}
                >
                  Current Phase: {cycleInfo?.phase || "Unknown"}
                </span>
                <h2 className="text-text-primary dark:text-white text-2xl font-bold mb-6">
                  {countdown.isPeriodActive
                    ? "🌸 Your period is here! Days until next cycle:"
                    : `Days until your next period`}
                </h2>

                {/* Timer Component */}
                <div className="flex gap-4 w-full max-w-md mx-auto">
                  <div className="flex grow basis-0 flex-col items-stretch gap-2">
                    <div className="flex h-16 items-center justify-center rounded-xl bg-border-light dark:bg-border-dark">
                      <p className="text-primary text-2xl font-black">
                        {String(countdown.days).padStart(2, "0")}
                      </p>
                    </div>
                    <p className="text-text-secondary text-xs font-bold uppercase">
                      Days
                    </p>
                  </div>
                  <div className="flex grow basis-0 flex-col items-stretch gap-2">
                    <div className="flex h-16 items-center justify-center rounded-xl bg-border-light dark:bg-border-dark">
                      <p className="text-text-primary dark:text-white text-2xl font-black">
                        {String(countdown.hours).padStart(2, "0")}
                      </p>
                    </div>
                    <p className="text-text-secondary text-xs font-bold uppercase">
                      Hours
                    </p>
                  </div>
                  <div className="flex grow basis-0 flex-col items-stretch gap-2">
                    <div className="flex h-16 items-center justify-center rounded-xl bg-border-light dark:bg-border-dark">
                      <p className="text-text-primary dark:text-white text-2xl font-black">
                        {String(countdown.minutes).padStart(2, "0")}
                      </p>
                    </div>
                    <p className="text-text-secondary text-xs font-bold uppercase">
                      Mins
                    </p>
                  </div>
                </div>

                {(countdown.nextPeriodDate ||
                  profile?.cycleData?.nextPeriodDate) && (
                  <p className="text-text-secondary text-base font-medium mt-6">
                    {countdown.isPeriodActive ? "Next cycle" : "Next period"}{" "}
                    expected on{" "}
                    {(
                      countdown.nextPeriodDate ||
                      new Date(profile.cycleData.nextPeriodDate!)
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}

                {/* Progress bar showing day in cycle */}
                {cycleInfo && profile?.cycleData?.cycleLength && (
                  <div className="w-full mt-6">
                    <div className="flex justify-between text-xs text-text-secondary mb-2">
                      <span>Day {cycleInfo.dayInCycle}</span>
                      <span>Day {profile.cycleData.cycleLength}</span>
                    </div>
                    <div className="w-full bg-border-light dark:bg-border-dark h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all"
                        style={{
                          width: `${(cycleInfo.dayInCycle / profile.cycleData.cycleLength) * 100}%`,
                        }}
                      />
                    </div>
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
                Your Daily Check-in
              </h2>

              {moodLogged ? (
                <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 text-center">
                  <span className="material-symbols-outlined text-green-500 text-4xl mb-2">
                    check_circle
                  </span>
                  <p className="text-green-700 dark:text-green-400 font-semibold">
                    Mood logged successfully!
                  </p>
                  <p className="text-green-600 dark:text-green-500 text-sm">
                    Thank you for checking in today.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-text-secondary mb-4">
                    How are you feeling today?
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
                        Log Detailed Symptoms
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
                      Complete Your Profile
                    </h3>
                    <p className="text-amber-700 dark:text-amber-400 text-sm mb-4">
                      Add your cycle information to get accurate predictions and
                      personalized reminders.
                    </p>
                    <Link href="/onboarding">
                      <Button>Complete Setup</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Side Column */}
          <div className="space-y-8">
            {/* Daily Tip Card */}
            <div className="bg-border-light dark:bg-border-dark p-6 rounded-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-primary">
                    lightbulb
                  </span>
                  <span className="text-primary font-bold uppercase text-xs tracking-widest">
                    Daily Tip
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
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Link href="/chat" className="block">
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-background-light dark:bg-background-dark hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <span className="material-symbols-outlined text-primary">
                        chat
                      </span>
                    </div>
                    <span className="text-sm font-medium">Talk to Sister</span>
                  </button>
                </Link>
                <Link href="/library" className="block">
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-background-light dark:bg-background-dark hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <span className="material-symbols-outlined text-primary">
                        menu_book
                      </span>
                    </div>
                    <span className="text-sm font-medium">Health Library</span>
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
                      Update Cycle Data
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
                  Need Support?
                </span>
              </div>
              <p className="text-sm mb-4 opacity-90">
                Our AI support is available 24/7 to answer your questions about
                menstrual health, emotional well-being, and more.
              </p>
              <Link href="/chat">
                <button className="w-full bg-white text-primary py-2 rounded-lg font-bold text-sm hover:bg-white/90 transition-colors">
                  Start Chatting
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

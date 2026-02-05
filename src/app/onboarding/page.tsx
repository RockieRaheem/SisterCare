"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { completeOnboarding, updateUserProfile } from "@/lib/firestore";
import {
  calculateNextPeriod,
  getCurrentPhase,
  schedulePeriodReminders,
} from "@/lib/firestore";

type OnboardingStep = "welcome" | "name" | "cycle" | "reminders" | "complete";

export default function OnboardingPage() {
  const { user, loading, userProfile, refreshProfile } = useAuth();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form data
  const [displayName, setDisplayName] = useState("");
  const [lastPeriodDate, setLastPeriodDate] = useState("");
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [reminderDays, setReminderDays] = useState(3);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    // If already completed onboarding, redirect to dashboard
    if (userProfile?.onboardingCompleted) {
      router.push("/dashboard");
    }
  }, [user, loading, userProfile, router]);

  const steps: OnboardingStep[] = [
    "welcome",
    "name",
    "cycle",
    "reminders",
    "complete",
  ];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setSaving(true);
    setError("");

    try {
      // Save display name
      if (displayName) {
        await updateUserProfile(user.uid, { displayName });
      }

      // Save cycle data and complete onboarding
      if (lastPeriodDate) {
        const lastDate = new Date(lastPeriodDate);
        await completeOnboarding(user.uid, lastDate, cycleLength, periodLength);

        // Schedule reminders
        const nextPeriod = calculateNextPeriod(lastDate, cycleLength);
        await schedulePeriodReminders(user.uid, nextPeriod, reminderDays);
      }

      // Refresh profile data
      await refreshProfile();

      // Move to completion step
      goNext();
    } catch (err) {
      console.error("Error completing onboarding:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const goToDashboard = () => {
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="flex justify-center py-5">
        <div className="flex flex-col max-w-[1200px] flex-1 px-6">
          <header className="flex items-center justify-between whitespace-nowrap border-b border-primary/10 py-3">
            <div className="flex items-center gap-4 text-primary">
              <span className="material-symbols-outlined text-3xl">
                favorite
              </span>
              <h2 className="text-text-primary dark:text-white text-xl font-bold leading-tight tracking-tight">
                SisterCare
              </h2>
            </div>
            {currentStep !== "complete" && (
              <button
                onClick={() => router.push("/dashboard")}
                className="text-text-secondary text-sm hover:text-primary transition-colors"
              >
                Skip for now
              </button>
            )}
          </header>
        </div>
      </div>

      {/* Progress Bar */}
      {currentStep !== "complete" && (
        <div className="max-w-[600px] mx-auto px-6 py-4">
          <div className="h-2 bg-border-light dark:bg-border-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-xs text-text-secondary mt-2">
            Step {currentStepIndex + 1} of {steps.length}
          </p>
        </div>
      )}

      {/* Main Content */}
      <main className="flex flex-1 justify-center items-center py-8 px-4">
        <div className="flex flex-col max-w-[520px] w-full">
          {error && (
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Welcome Step */}
          {currentStep === "welcome" && (
            <div className="text-center animate-fadeIn">
              <div className="mb-8 p-6 bg-primary/10 rounded-full w-32 h-32 mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-6xl">
                  waving_hand
                </span>
              </div>
              <h1 className="text-text-primary dark:text-white text-3xl md:text-4xl font-black mb-4">
                Welcome to SisterCare
              </h1>
              <p className="text-text-secondary text-lg mb-8 max-w-md mx-auto">
                Let&apos;s set up your profile so we can provide personalized
                menstrual health support and timely reminders.
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={goNext} icon="arrow_forward" fullWidth>
                  Get Started
                </Button>
                <p className="text-xs text-text-secondary">
                  This will only take 2 minutes
                </p>
              </div>
            </div>
          )}

          {/* Name Step */}
          {currentStep === "name" && (
            <div className="animate-fadeIn">
              <div className="text-center mb-8">
                <div className="mb-6 p-4 bg-primary/10 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-4xl">
                    person
                  </span>
                </div>
                <h1 className="text-text-primary dark:text-white text-2xl md:text-3xl font-black mb-2">
                  What should we call you?
                </h1>
                <p className="text-text-secondary">
                  This helps us personalize your experience
                </p>
              </div>

              <div className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-lg border border-primary/5 mb-8">
                <Input
                  label="Your Name"
                  type="text"
                  placeholder="e.g., Sarah, Queen, Sis"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={goBack}>
                  Back
                </Button>
                <Button onClick={goNext} icon="arrow_forward" fullWidth>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Cycle Step */}
          {currentStep === "cycle" && (
            <div className="animate-fadeIn">
              <div className="text-center mb-8">
                <div className="mb-6 p-4 bg-primary/10 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-4xl">
                    calendar_month
                  </span>
                </div>
                <h1 className="text-text-primary dark:text-white text-2xl md:text-3xl font-black mb-2">
                  Tell us about your cycle
                </h1>
                <p className="text-text-secondary">
                  This helps us predict your next period accurately
                </p>
              </div>

              <div className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-lg border border-primary/5 mb-8 space-y-6">
                <Input
                  label="When did your last period start?"
                  type="date"
                  value={lastPeriodDate}
                  onChange={(e) => setLastPeriodDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />

                <div className="flex flex-col gap-3">
                  <label className="text-text-primary dark:text-white text-sm font-semibold">
                    How long is your typical cycle?
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="21"
                      max="40"
                      value={cycleLength}
                      onChange={(e) => setCycleLength(Number(e.target.value))}
                      className="flex-1 h-2 bg-border-light dark:bg-border-dark rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <span className="text-primary font-bold text-xl min-w-[60px] text-right">
                      {cycleLength} days
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Most cycles are between 21-35 days. Average is 28 days.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-text-primary dark:text-white text-sm font-semibold">
                    How long does your period usually last?
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="2"
                      max="10"
                      value={periodLength}
                      onChange={(e) => setPeriodLength(Number(e.target.value))}
                      className="flex-1 h-2 bg-border-light dark:bg-border-dark rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <span className="text-primary font-bold text-xl min-w-[60px] text-right">
                      {periodLength} days
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Most periods last 3-7 days. Average is 5 days.
                  </p>
                </div>

                {/* Preview */}
                {lastPeriodDate && (
                  <div className="mt-4 p-4 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20">
                    <p className="text-sm text-primary font-semibold mb-1">
                      Based on this information:
                    </p>
                    <p className="text-text-primary dark:text-white">
                      Your next period is expected around{" "}
                      <strong>
                        {calculateNextPeriod(
                          new Date(lastPeriodDate),
                          cycleLength,
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                        })}
                      </strong>
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={goBack}>
                  Back
                </Button>
                <Button
                  onClick={goNext}
                  icon="arrow_forward"
                  fullWidth
                  disabled={!lastPeriodDate}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Reminders Step */}
          {currentStep === "reminders" && (
            <div className="animate-fadeIn">
              <div className="text-center mb-8">
                <div className="mb-6 p-4 bg-primary/10 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-4xl">
                    notifications_active
                  </span>
                </div>
                <h1 className="text-text-primary dark:text-white text-2xl md:text-3xl font-black mb-2">
                  Set up reminders
                </h1>
                <p className="text-text-secondary">
                  Never be caught unprepared again
                </p>
              </div>

              <div className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-lg border border-primary/5 mb-8">
                <div className="flex flex-col gap-4">
                  <label className="text-text-primary dark:text-white text-sm font-semibold">
                    Remind me before my period starts
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 5].map((days) => (
                      <button
                        key={days}
                        onClick={() => setReminderDays(days)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          reminderDays === days
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border-light dark:border-border-dark hover:border-primary/50"
                        }`}
                      >
                        <span className="block text-2xl font-bold">{days}</span>
                        <span className="text-xs">
                          day{days !== 1 ? "s" : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-text-secondary mt-2">
                    We&apos;ll send you a gentle reminder {reminderDays} day
                    {reminderDays !== 1 ? "s" : ""} before your expected period
                    so you can prepare.
                  </p>
                </div>

                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400">
                      check_circle
                    </span>
                    <div>
                      <p className="text-green-700 dark:text-green-400 font-semibold text-sm">
                        Your data is private
                      </p>
                      <p className="text-green-600 dark:text-green-500 text-xs">
                        All your cycle information is encrypted and only visible
                        to you.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={goBack}>
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  icon={saving ? undefined : "check"}
                  fullWidth
                  disabled={saving}
                >
                  {saving ? "Setting up..." : "Complete Setup"}
                </Button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === "complete" && (
            <div className="text-center animate-fadeIn">
              <div className="mb-8 p-6 bg-green-100 dark:bg-green-900/30 rounded-full w-32 h-32 mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-6xl">
                  celebration
                </span>
              </div>
              <h1 className="text-text-primary dark:text-white text-3xl md:text-4xl font-black mb-4">
                You&apos;re all set, {displayName || "Sister"}!
              </h1>
              <p className="text-text-secondary text-lg mb-8 max-w-md mx-auto">
                Your profile is ready. We&apos;ll help you stay prepared and
                supported throughout your cycle journey.
              </p>

              <div className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-lg border border-primary/5 mb-8 text-left">
                <h3 className="text-text-primary dark:text-white font-bold mb-4">
                  What&apos;s next?
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-lg">
                        dashboard
                      </span>
                    </div>
                    <span className="text-text-secondary">
                      View your cycle dashboard
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-lg">
                        chat
                      </span>
                    </div>
                    <span className="text-text-secondary">
                      Chat with our support system
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-lg">
                        menu_book
                      </span>
                    </div>
                    <span className="text-text-secondary">
                      Explore health guidance articles
                    </span>
                  </li>
                </ul>
              </div>

              <Button onClick={goToDashboard} icon="arrow_forward" fullWidth>
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}

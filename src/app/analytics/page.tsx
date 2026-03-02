"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import Header from "@/components/layout/Header";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { getUserProfile, getSymptoms } from "@/lib/firestore";
import { UserProfile, SymptomLog, MoodType } from "@/types";

// Color mapping for moods
const moodColors: Record<MoodType, string> = {
  great: "#10B981", // green
  good: "#34D399", // emerald
  okay: "#FBBF24", // amber
  low: "#FB923C", // orange
  bad: "#EF4444", // red
};

const moodEmojis: Record<MoodType, string> = {
  great: "🤩",
  good: "😊",
  okay: "😐",
  low: "😔",
  bad: "😞",
};

// Common symptom colors
const symptomColors: Record<string, string> = {
  cramps: "#F472B6",
  bloating: "#A78BFA",
  headache: "#60A5FA",
  fatigue: "#FBBF24",
  backache: "#FB923C",
  nausea: "#34D399",
  moodSwings: "#F87171",
};

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "week" | "month" | "3months"
  >("month");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        // Get last 90 days of symptom data
        const endDate = new Date();
        const startDate = new Date(
          endDate.getTime() - 90 * 24 * 60 * 60 * 1000,
        );

        const [userProfile, logs] = await Promise.all([
          getUserProfile(user.uid),
          getSymptoms(user.uid, startDate, endDate),
        ]);
        setProfile(userProfile);
        setSymptomLogs(logs || []);
      } catch (error) {
        console.error("Error loading analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user && !authLoading) {
      loadData();
    }
  }, [user, authLoading]);

  // Filter logs based on selected period
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const days =
      selectedPeriod === "week" ? 7 : selectedPeriod === "month" ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return symptomLogs.filter((log) => {
      const logDate = log.date instanceof Date ? log.date : new Date(log.date);
      return logDate >= cutoff;
    });
  }, [symptomLogs, selectedPeriod]);

  // Calculate mood distribution
  const moodDistribution = useMemo(() => {
    const counts: Record<MoodType, number> = {
      great: 0,
      good: 0,
      okay: 0,
      low: 0,
      bad: 0,
    };

    filteredLogs.forEach((log) => {
      if (log.mood && counts[log.mood] !== undefined) {
        counts[log.mood]++;
      }
    });

    return counts;
  }, [filteredLogs]);

  // Calculate symptom frequency
  const symptomFrequency = useMemo(() => {
    const counts: Record<string, number> = {};

    filteredLogs.forEach((log) => {
      log.symptoms?.forEach((symptom) => {
        counts[symptom] = (counts[symptom] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [filteredLogs]);

  // Calculate mood trend over time
  const moodTrend = useMemo(() => {
    const moodValues: Record<MoodType, number> = {
      great: 5,
      good: 4,
      okay: 3,
      low: 2,
      bad: 1,
    };

    // Group by week
    const weeks: { week: string; average: number; count: number }[] = [];
    const groupedByWeek: Record<string, number[]> = {};

    filteredLogs.forEach((log) => {
      const logDate = log.date instanceof Date ? log.date : new Date(log.date);
      const weekStart = new Date(logDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!groupedByWeek[weekKey]) {
        groupedByWeek[weekKey] = [];
      }
      if (log.mood && moodValues[log.mood]) {
        groupedByWeek[weekKey].push(moodValues[log.mood]);
      }
    });

    Object.entries(groupedByWeek).forEach(([week, values]) => {
      if (values.length > 0) {
        weeks.push({
          week,
          average: values.reduce((a, b) => a + b, 0) / values.length,
          count: values.length,
        });
      }
    });

    return weeks.sort((a, b) => a.week.localeCompare(b.week));
  }, [filteredLogs]);

  // Cycle statistics
  const cycleStats = useMemo(() => {
    const history = profile?.cycleData?.history || [];

    if (history.length === 0) {
      return {
        averageCycleLength: profile?.cycleData?.cycleLength || 28,
        averagePeriodLength: profile?.cycleData?.periodLength || 5,
        totalCycles: 0,
        shortestCycle: 0,
        longestCycle: 0,
      };
    }

    const cycleLengths = history.map((h) => h.cycleLength).filter((l) => l > 0);
    const periodLengths = history
      .map((h) => h.periodLength)
      .filter((l) => l > 0);

    return {
      averageCycleLength:
        cycleLengths.length > 0
          ? Math.round(
              cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length,
            )
          : profile?.cycleData?.cycleLength || 28,
      averagePeriodLength:
        periodLengths.length > 0
          ? Math.round(
              periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length,
            )
          : profile?.cycleData?.periodLength || 5,
      totalCycles: history.length,
      shortestCycle: cycleLengths.length > 0 ? Math.min(...cycleLengths) : 0,
      longestCycle: cycleLengths.length > 0 ? Math.max(...cycleLengths) : 0,
    };
  }, [profile]);

  // Calculate total logged days
  const totalLoggedDays = filteredLogs.length;
  const totalSymptoms = filteredLogs.reduce(
    (acc, log) => acc + (log.symptoms?.length || 0),
    0,
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header variant="app" />

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 sm:px-6 py-5 sm:py-8 main-content">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-text-primary dark:text-white text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-3xl">
                analytics
              </span>
              Analytics & Insights
            </h1>
            <p className="text-text-secondary mt-1">
              Track your health patterns and gain insights about your cycle
            </p>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2 bg-white dark:bg-card-dark p-1 rounded-xl border border-border-light dark:border-border-dark">
            {(["week", "month", "3months"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedPeriod === period
                    ? "bg-primary text-white"
                    : "text-text-secondary hover:bg-primary/10"
                }`}
              >
                {period === "week"
                  ? "Week"
                  : period === "month"
                    ? "Month"
                    : "3 Months"}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card padding="md" className="text-center">
            <div className="text-3xl sm:text-4xl font-black text-primary">
              {totalLoggedDays}
            </div>
            <div className="text-sm text-text-secondary mt-1">Days Logged</div>
          </Card>
          <Card padding="md" className="text-center">
            <div className="text-3xl sm:text-4xl font-black text-purple-500">
              {totalSymptoms}
            </div>
            <div className="text-sm text-text-secondary mt-1">
              Symptoms Tracked
            </div>
          </Card>
          <Card padding="md" className="text-center">
            <div className="text-3xl sm:text-4xl font-black text-emerald-500">
              {cycleStats.averageCycleLength}
            </div>
            <div className="text-sm text-text-secondary mt-1">
              Avg. Cycle (days)
            </div>
          </Card>
          <Card padding="md" className="text-center">
            <div className="text-3xl sm:text-4xl font-black text-pink-500">
              {cycleStats.averagePeriodLength}
            </div>
            <div className="text-sm text-text-secondary mt-1">
              Avg. Period (days)
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mood Distribution Chart */}
          <Card padding="lg">
            <h2 className="text-lg font-bold text-text-primary dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                mood
              </span>
              Mood Distribution
            </h2>

            {Object.values(moodDistribution).some((v) => v > 0) ? (
              <div className="space-y-3">
                {(Object.entries(moodDistribution) as [MoodType, number][]).map(
                  ([mood, count]) => {
                    const total = Object.values(moodDistribution).reduce(
                      (a, b) => a + b,
                      0,
                    );
                    const percentage = total > 0 ? (count / total) * 100 : 0;

                    return (
                      <div key={mood} className="flex items-center gap-3">
                        <span className="text-2xl w-8">{moodEmojis[mood]}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize text-text-primary dark:text-white font-medium">
                              {mood}
                            </span>
                            <span className="text-text-secondary">
                              {count} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: moodColors[mood],
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <span className="material-symbols-outlined text-4xl mb-2">
                  sentiment_neutral
                </span>
                <p>No mood data logged yet</p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push("/dashboard")}
                >
                  Log Your Mood
                </Button>
              </div>
            )}
          </Card>

          {/* Top Symptoms Chart */}
          <Card padding="lg">
            <h2 className="text-lg font-bold text-text-primary dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                health_metrics
              </span>
              Top Symptoms
            </h2>

            {symptomFrequency.length > 0 ? (
              <div className="space-y-3">
                {symptomFrequency.map(([symptom, count], index) => {
                  const maxCount = symptomFrequency[0][1];
                  const percentage = (count / maxCount) * 100;
                  const color = symptomColors[symptom] || "#8c30e8";

                  return (
                    <div key={symptom} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-text-secondary w-6">
                        #{index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize text-text-primary dark:text-white font-medium">
                            {symptom.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          <span className="text-text-secondary">{count}x</span>
                        </div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <span className="material-symbols-outlined text-4xl mb-2">
                  monitor_heart
                </span>
                <p>No symptoms logged yet</p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push("/dashboard")}
                >
                  Log Symptoms
                </Button>
              </div>
            )}
          </Card>

          {/* Mood Trend Chart */}
          <Card padding="lg" className="lg:col-span-2">
            <h2 className="text-lg font-bold text-text-primary dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                trending_up
              </span>
              Mood Trend Over Time
            </h2>

            {moodTrend.length > 1 ? (
              <div className="h-48 flex items-end gap-2 overflow-x-auto pb-2">
                {moodTrend.map((week, index) => {
                  const height = (week.average / 5) * 100;
                  const color =
                    week.average >= 4
                      ? "#10B981"
                      : week.average >= 3
                        ? "#FBBF24"
                        : "#EF4444";
                  const date = new Date(week.week);

                  return (
                    <div
                      key={week.week}
                      className="flex flex-col items-center min-w-[50px]"
                    >
                      <div className="flex-1 w-full flex items-end justify-center">
                        <div
                          className="w-8 rounded-t-lg transition-all duration-500 hover:opacity-80"
                          style={{
                            height: `${height}%`,
                            backgroundColor: color,
                            minHeight: "10px",
                          }}
                          title={`Week: ${week.week}, Avg: ${week.average.toFixed(1)}, Logs: ${week.count}`}
                        />
                      </div>
                      <div className="text-xs text-text-secondary mt-2 text-center">
                        {date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <span className="material-symbols-outlined text-4xl mb-2">
                  show_chart
                </span>
                <p>Log more moods to see your trend</p>
              </div>
            )}

            {/* Legend */}
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-text-secondary">Feeling Good</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-text-secondary">Neutral</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-text-secondary">Feeling Low</span>
              </div>
            </div>
          </Card>

          {/* Cycle History */}
          <Card padding="lg" className="lg:col-span-2">
            <h2 className="text-lg font-bold text-text-primary dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                cycle
              </span>
              Cycle Statistics
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-pink-50 to-white dark:from-pink-900/20 dark:to-card-dark p-4 rounded-xl text-center border border-pink-100 dark:border-pink-800/30">
                <div className="text-2xl font-black text-pink-500">
                  {cycleStats.totalCycles}
                </div>
                <div className="text-sm text-text-secondary mt-1">
                  Cycles Tracked
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-card-dark p-4 rounded-xl text-center border border-purple-100 dark:border-purple-800/30">
                <div className="text-2xl font-black text-purple-500">
                  {cycleStats.averageCycleLength}
                </div>
                <div className="text-sm text-text-secondary mt-1">
                  Avg. Cycle Length
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-card-dark p-4 rounded-xl text-center border border-emerald-100 dark:border-emerald-800/30">
                <div className="text-2xl font-black text-emerald-500">
                  {cycleStats.shortestCycle > 0
                    ? cycleStats.shortestCycle
                    : "-"}
                </div>
                <div className="text-sm text-text-secondary mt-1">
                  Shortest Cycle
                </div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-card-dark p-4 rounded-xl text-center border border-amber-100 dark:border-amber-800/30">
                <div className="text-2xl font-black text-amber-500">
                  {cycleStats.longestCycle > 0 ? cycleStats.longestCycle : "-"}
                </div>
                <div className="text-sm text-text-secondary mt-1">
                  Longest Cycle
                </div>
              </div>
            </div>

            {cycleStats.totalCycles === 0 && (
              <div className="text-center py-6 text-text-secondary mt-4 border-t border-border-light dark:border-border-dark">
                <p>Start tracking your cycles to see detailed statistics</p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push("/profile")}
                >
                  Set Up Cycle Tracking
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Export Option */}
        <Card padding="md" className="mt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">
                download
              </span>
              <div>
                <h3 className="font-bold text-text-primary dark:text-white">
                  Export Your Data
                </h3>
                <p className="text-sm text-text-secondary">
                  Download your health data for your records
                </p>
              </div>
            </div>
            <Button variant="secondary" icon="download">
              Export as PDF
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}

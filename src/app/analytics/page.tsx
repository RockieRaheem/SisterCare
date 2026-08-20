"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { AppShellSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { getCycleHistory, getSymptoms, getUserProfile } from "@/lib/dataClient";
import { mergeCycleHistory, observedCycleSummary } from "@/lib/cycleHistory";
import { getWellbeingCheckIns } from "@/lib/wellbeingClient";
import {
  localWellbeingDate,
} from "@/lib/wellbeing";
import {
  contextLabel,
  feelingDetails,
  wellbeingSupportMessage,
} from "@/lib/wellbeingPresentation";
import type { CycleHistory, SymptomLog, UserProfile, WellbeingCheckIn } from "@/types";

type Period = "week" | "month" | "3months";
const PERIOD_DAYS: Record<Period, number> = { week: 7, month: 30, "3months": 90 };
const PERIOD_LABELS: Record<Period, string> = { week: "Past 7 days", month: "Past 30 days", "3months": "Past 3 months" };

const hydrateCheckIn = (entry: WellbeingCheckIn): WellbeingCheckIn => ({
  ...entry,
  createdAt: new Date(entry.createdAt),
  updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : undefined,
});

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [cycleHistory, setCycleHistory] = useState<CycleHistory[]>([]);
  const [checkIns, setCheckIns] = useState<WellbeingCheckIn[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("month");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referenceTime] = useState(() => Date.now());
  const [today] = useState(() => localWellbeingDate());

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/login");
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!user || authLoading) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 90 * 86_400_000);
      const [profileResult, symptomsResult, wellbeingResult, cycleHistoryResult] = await Promise.allSettled([
        getUserProfile(user.uid),
        getSymptoms(user.uid, startDate, endDate),
        getWellbeingCheckIns(user.uid),
        getCycleHistory(user.uid, 24),
      ]);
      if (profileResult.status === "fulfilled") setProfile(profileResult.value);
      if (symptomsResult.status === "fulfilled") setSymptomLogs(symptomsResult.value || []);
      if (wellbeingResult.status === "fulfilled") {
        const entries = wellbeingResult.value.map(hydrateCheckIn);
        setCheckIns(entries);
        setSelectedEntryId((current) => current || entries[0]?.id || null);
      } else {
        setError("Your private timeline could not be loaded. Please try again.");
      }
      if (cycleHistoryResult.status === "fulfilled") setCycleHistory(cycleHistoryResult.value);
      setLoading(false);
    };
    void load();
  }, [authLoading, user]);

  const cutoff = useMemo(
    () => new Date(referenceTime - PERIOD_DAYS[selectedPeriod] * 86_400_000),
    [referenceTime, selectedPeriod],
  );
  const filteredCheckIns = useMemo(
    () => checkIns.filter((entry) => entry.createdAt >= cutoff),
    [checkIns, cutoff],
  );
  const filteredSymptoms = useMemo(
    () => symptomLogs.filter((entry) => new Date(entry.date) >= cutoff),
    [cutoff, symptomLogs],
  );
  const chronological = useMemo(
    () => [...filteredCheckIns].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    [filteredCheckIns],
  );
  const selectedEntry =
    filteredCheckIns.find((entry) => entry.id === selectedEntryId) ||
    filteredCheckIns[0] ||
    null;

  const symptomCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filteredSymptoms.forEach((entry) =>
      (entry.symptoms || []).forEach((symptom) => counts.set(symptom, (counts.get(symptom) || 0) + 1)),
    );
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredSymptoms]);

  const symptomDayCount = useMemo(
    () => new Set(filteredSymptoms.map((entry) => localWellbeingDate(new Date(entry.date)))).size,
    [filteredSymptoms],
  );

  const cycleSummary = useMemo(() => {
    const history = mergeCycleHistory(cycleHistory, profile?.cycleData?.history || []);
    const observed = observedCycleSummary(history);
    return {
      ...observed,
      cycle: observed.cycle ?? profile?.cycleData?.cycleLength ?? null,
      period: observed.period ?? profile?.cycleData?.periodLength ?? null,
      hasObservedAverages: observed.cycle !== null || observed.period !== null,
    };
  }, [cycleHistory, profile]);

  if (authLoading || loading) return <AppShellSkeleton />;
  if (!user) return null;

  return (
    <div className="app-page min-h-screen">
      <Header variant="app" />
      <main className="main-content page-container pb-32 pt-6 md:pb-12 md:pt-8">
        <header className="relative grid gap-5 overflow-hidden rounded-3xl border border-primary/20 bg-white p-6 text-text-primary shadow-soft-lg dark:border-primary/30 dark:bg-card-dark dark:text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/10 blur-2xl" aria-hidden="true" />
          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-primary"><span className="material-symbols-outlined text-lg" aria-hidden="true">timeline</span>Track</span>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Your private timeline</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base">Review the feelings, notes and body information you chose to save. These records are not a score or diagnosis.</p>
          </div>
          <Link href="/wellbeing" className="relative inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-white shadow-primary-sm"><span className="material-symbols-outlined" aria-hidden="true">edit_note</span>{checkIns[0]?.localDate === today ? "Update today's check-in" : "Check in today"}</Link>
        </header>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-black text-text-primary dark:text-white">Time range</p>
          <div className="flex max-w-full gap-2 overflow-x-auto rounded-2xl border border-border-light bg-white p-1.5 dark:border-border-dark dark:bg-card-dark" aria-label="Timeline time range">
          {(Object.keys(PERIOD_DAYS) as Period[]).map((period) => (
            <button key={period} type="button" onClick={() => setSelectedPeriod(period)} aria-pressed={selectedPeriod === period} className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-bold transition ${selectedPeriod === period ? "bg-primary text-white" : "text-text-secondary hover:bg-primary/8"}`}>{PERIOD_LABELS[period]}</button>
          ))}
          </div>
        </div>

        {error && <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">{error}</div>}

        {filteredCheckIns.length === 0 ? (
          <section className="mt-6 rounded-3xl border border-dashed border-primary/25 bg-primary/[0.03] p-8 text-center sm:p-12">
            <span className="material-symbols-outlined text-5xl text-primary" aria-hidden="true">psychiatry</span>
            <h2 className="mt-3 text-2xl font-black text-text-primary dark:text-white">Nothing has been saved here yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-secondary">If remembering today may help later, save one feeling and optional context. You never need to complete a questionnaire or maintain a streak.</p>
            <Link href="/wellbeing" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-white">Save one private word</Link>
          </section>
        ) : (
          <>
            <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
              <div className="rounded-3xl border border-border-light bg-white p-5 shadow-soft dark:border-border-dark dark:bg-card-dark sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div><span className="eyebrow">Daily view · {filteredCheckIns.length} {filteredCheckIns.length === 1 ? "saved day" : "saved days"}</span><h2 className="mt-1 text-xl font-black text-text-primary dark:text-white">Your emotional timeline</h2><p className="mt-1 text-sm text-text-secondary">Tap a day to remember what was happening.</p></div>
                </div>
                <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
                  {chronological.map((entry) => {
                    const selected = selectedEntry?.id === entry.id;
                    const primaryFeeling = entry.feelings?.[0];
                    const details = primaryFeeling ? feelingDetails(primaryFeeling) : null;
                    return (
                      <button key={entry.id} type="button" aria-pressed={selected} aria-label={`${entry.localDate}, ${details?.label || "earlier check-in"}`} onClick={() => setSelectedEntryId(entry.id)} className={`group flex min-h-28 min-w-24 flex-col items-center justify-center gap-2 rounded-2xl border px-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? "border-primary bg-primary/10 shadow-primary-sm" : "border-border-light bg-background-light hover:border-primary/40 dark:border-border-dark dark:bg-background-dark"}`}>
                        <span className="text-3xl" aria-hidden="true">{details?.emoji || "•"}</span>
                        <span className={`text-xs font-black ${selected ? "text-primary" : "text-text-primary dark:text-white"}`}>{details?.label || "Check-in"}</span>
                        <span className="text-[10px] font-bold text-text-secondary">{entry.createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedEntry && <CheckInDetail entry={selectedEntry} />}
            </section>

          </>
        )}

        <section className="mt-8 overflow-hidden rounded-3xl border border-border-light bg-white dark:border-border-dark dark:bg-card-dark">
          <div className="border-b border-border-light bg-background-light p-5 dark:border-border-dark dark:bg-background-dark sm:p-6">
            <span className="eyebrow">Separate body record</span><h2 className="mt-1 text-2xl font-black text-text-primary dark:text-white">Cycle and physical symptoms</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Use this for menstrual planning and physical history. It stays separate from your emotional timeline because SisterCare does not assume menstruation caused a feeling.</p>
          </div>
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[0.85fr_1.15fr]">
            {profile?.pregnancyData?.isPregnant ? (
              <div className="rounded-2xl bg-primary/[0.05] p-5"><p className="font-black text-text-primary dark:text-white">Period tracking is paused</p><p className="mt-2 text-sm leading-6 text-text-secondary">Your profile is currently using pregnancy support, so period statistics are not presented as active predictions.</p></div>
            ) : profile?.cycleData ? (
              <div><div className="grid grid-cols-2 gap-3"><Metric value={cycleSummary.cycle ? `${cycleSummary.cycle} days` : "—"} label={cycleSummary.hasObservedAverages ? "Typical cycle" : "Expected cycle"} /><Metric value={cycleSummary.period ? `${cycleSummary.period} days` : "—"} label={cycleSummary.hasObservedAverages ? "Typical period" : "Expected period"} /><Metric value={String(cycleSummary.count)} label="Completed cycles" /><Metric value={String(symptomDayCount)} label="Days with symptoms" /></div>{cycleSummary.count === 0 && <p className="mt-3 rounded-xl bg-primary/[0.04] px-3 py-2 text-xs leading-5 text-text-secondary">No completed cycle is recorded yet. When you confirm your next period start, SisterCare will close this cycle and begin calculating your observed pattern.</p>}</div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border-light p-5 dark:border-border-dark"><p className="font-black text-text-primary dark:text-white">Cycle details are optional</p><p className="mt-2 text-sm leading-6 text-text-secondary">Add them when tracking feels useful. Emotional support remains available without cycle setup.</p><Link href="/onboarding?mode=edit" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-primary">Set up cycle tracking <span className="material-symbols-outlined text-lg">arrow_forward</span></Link></div>
            )}
            <div>
              <h3 className="font-black text-text-primary dark:text-white">Physical symptoms mentioned</h3>
              {symptomCounts.length ? <div className="mt-3 flex flex-wrap gap-2">{symptomCounts.map(([symptom, count]) => <span key={symptom} className="rounded-full border border-border-light bg-background-light px-3 py-2 text-sm font-semibold text-text-primary dark:border-border-dark dark:bg-background-dark dark:text-white">{symptom.replace(/_/g, " ")} · {count}</span>)}</div> : <p className="mt-3 text-sm text-text-secondary">No physical symptoms were recorded in this period.</p>}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link href="/chat" className="group flex min-h-24 items-center gap-4 rounded-2xl bg-primary p-4 text-white shadow-primary-sm"><span className="material-symbols-outlined text-3xl" aria-hidden="true">chat_bubble</span><span><span className="block font-black">Talk privately</span><span className="mt-1 block text-xs text-white/75">Put today into words with Sister</span></span></Link>
          <Link href="/counsellors" className="group flex min-h-24 items-center gap-4 rounded-2xl border border-border-light bg-white p-4 dark:border-border-dark dark:bg-card-dark"><span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">support_agent</span><span><span className="block font-black text-text-primary dark:text-white">Human support</span><span className="mt-1 block text-xs text-text-secondary">See available verified counsellors</span></span></Link>
          <Link href="/settings" className="group flex min-h-24 items-center gap-4 rounded-2xl border border-border-light bg-white p-4 dark:border-border-dark dark:bg-card-dark"><span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">shield_lock</span><span><span className="block font-black text-text-primary dark:text-white">Your data</span><span className="mt-1 block text-xs text-text-secondary">Manage privacy or export records</span></span></Link>
        </section>
      </main>
    </div>
  );
}

function CheckInDetail({ entry }: { entry: WellbeingCheckIn }) {
  const support = wellbeingSupportMessage(entry);
  const primaryFeeling = entry.feelings?.[0];
  const details = primaryFeeling ? feelingDetails(primaryFeeling) : null;
  return (
    <article className="rounded-3xl border border-primary/15 bg-primary/[0.04] p-5 sm:p-6">
      <div><span className="eyebrow">Selected day</span><h2 className="mt-1 text-xl font-black text-text-primary dark:text-white">{entry.createdAt.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h2></div>
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-card-dark"><span className="text-4xl" aria-hidden="true">{details?.emoji || "•"}</span><div><p className="text-xs font-bold uppercase tracking-wide text-text-secondary">You felt</p><p className="text-lg font-black text-text-primary dark:text-white">{details?.label || "Checked in"}</p></div></div>
      {(entry.contexts || []).length > 0 && <p className="mt-4 text-xs leading-5 text-text-secondary">Context: {(entry.contexts || []).map(contextLabel).join(", ")}</p>}
      {entry.note && <p className="mt-3 rounded-2xl bg-white p-3 text-sm leading-6 text-text-primary dark:bg-card-dark dark:text-gray-200">{entry.note}</p>}
      <div className="mt-4 border-t border-primary/10 pt-4"><p className="text-sm font-black text-text-primary dark:text-white">{support.title}</p><p className="mt-1 text-xs leading-5 text-text-secondary">{support.message}</p></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2"><Link href="/chat" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-white"><span className="material-symbols-outlined text-lg" aria-hidden="true">chat_bubble</span>Talk about this</Link><Link href="/counsellors" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-white px-3 text-sm font-bold text-primary dark:bg-card-dark"><span className="material-symbols-outlined text-lg" aria-hidden="true">support_agent</span>Ask a counsellor</Link></div>
    </article>
  );
}

function Metric({ value, label, compact = false }: { value: string; label: string; compact?: boolean }) {
  return <div className={`rounded-2xl bg-background-light text-center dark:bg-background-dark ${compact ? "p-2.5" : "p-4"}`}><p className={`${compact ? "text-base" : "text-xl"} font-black text-text-primary dark:text-white`}>{value}</p><p className="mt-1 text-[11px] font-semibold text-text-secondary">{label}</p></div>;
}

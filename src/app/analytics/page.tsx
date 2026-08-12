"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { AppShellSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import { getSymptoms, getUserProfile } from "@/lib/dataClient";
import {
  localWellbeingDate,
  type WellbeingContext,
  type WellbeingFeeling,
} from "@/lib/wellbeing";
import {
  contextLabel,
  feelingDetails,
  wellbeingSupportMessage,
} from "@/lib/wellbeingPresentation";
import type { SymptomLog, UserProfile, WellbeingCheckIn } from "@/types";

type Period = "week" | "month" | "3months";
const PERIOD_DAYS: Record<Period, number> = { week: 7, month: 30, "3months": 90 };
const PERIOD_LABELS: Record<Period, string> = { week: "7 days", month: "30 days", "3months": "3 months" };

const hydrateCheckIn = (entry: WellbeingCheckIn): WellbeingCheckIn => ({
  ...entry,
  createdAt: new Date(entry.createdAt),
  updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : undefined,
});

const average = (values: number[]): number | null =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const scoreLabel = (score: number | null, inverse = false): string => {
  if (score === null) return "—";
  if (inverse) return score >= 4 ? "High" : score >= 3 ? "Moderate" : "Low";
  return score >= 4 ? "Good" : score >= 3 ? "Mixed" : "Low";
};

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
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
      const [profileResult, symptomsResult, wellbeingResult] = await Promise.allSettled([
        getUserProfile(user.uid),
        getSymptoms(user.uid, startDate, endDate),
        authenticatedFetch("/api/wellbeing", { cache: "no-store" }),
      ]);
      if (profileResult.status === "fulfilled") setProfile(profileResult.value);
      if (symptomsResult.status === "fulfilled") setSymptomLogs(symptomsResult.value || []);
      if (wellbeingResult.status === "fulfilled") {
        const payload = await wellbeingResult.value.json().catch(() => ({}));
        if (wellbeingResult.value.ok) {
          const entries = (payload.data?.checkIns || []).map(hydrateCheckIn);
          setCheckIns(entries);
          setSelectedEntryId((current) => current || entries[0]?.id || null);
        } else {
          setError(payload.error || "Your wellbeing patterns could not be loaded.");
        }
      } else {
        setError("Your wellbeing patterns could not be loaded.");
      }
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

  const averages = useMemo(
    () => ({
      mood: average(filteredCheckIns.map((entry) => entry.mood)),
      stress: average(filteredCheckIns.map((entry) => entry.stress)),
      sleep: average(filteredCheckIns.map((entry) => entry.sleep)),
      energy: average(filteredCheckIns.map((entry) => entry.energy)),
    }),
    [filteredCheckIns],
  );

  const feelingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filteredCheckIns.forEach((entry) =>
      (entry.feelings || []).forEach((feeling) => counts.set(feeling, (counts.get(feeling) || 0) + 1)),
    );
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [filteredCheckIns]);

  const contextCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filteredCheckIns.forEach((entry) =>
      (entry.contexts || []).forEach((context) => counts.set(context, (counts.get(context) || 0) + 1)),
    );
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [filteredCheckIns]);

  const symptomCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filteredSymptoms.forEach((entry) =>
      (entry.symptoms || []).forEach((symptom) => counts.set(symptom, (counts.get(symptom) || 0) + 1)),
    );
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredSymptoms]);

  const cycleSummary = useMemo(() => {
    const history = profile?.cycleData?.history || [];
    const cycles = history.map((entry) => entry.cycleLength).filter((value) => value > 0);
    const periods = history.map((entry) => entry.periodLength).filter((value) => value > 0);
    return {
      count: history.length,
      cycle: cycles.length ? Math.round(average(cycles) as number) : profile?.cycleData?.cycleLength || null,
      period: periods.length ? Math.round(average(periods) as number) : profile?.cycleData?.periodLength || null,
    };
  }, [profile]);

  const patternNotes = useMemo(() => {
    if (filteredCheckIns.length < 3) {
      return ["A few more check-ins will make patterns easier to notice. There is no need to log more than once a day."];
    }
    const notes: string[] = [];
    if ((averages.stress || 0) >= 4) notes.push("Stress has often felt high in this period. Consider choosing support before it becomes harder to carry.");
    if ((averages.sleep || 5) <= 2.5) notes.push("Rest has often felt difficult. You may want to talk about what is interrupting sleep.");
    if ((averages.energy || 5) <= 2.5) notes.push("Low energy has appeared often. A smaller pace and practical support may be worth considering.");
    if (contextCounts[0]) notes.push(`${contextLabel(contextCounts[0][0] as WellbeingContext)} was the context you mentioned most often.`);
    return notes.length ? notes : ["Your recent check-ins look varied. Open any day below to remember what was happening around it."];
  }, [averages.energy, averages.sleep, averages.stress, contextCounts, filteredCheckIns.length]);

  if (authLoading || loading) return <AppShellSkeleton />;
  if (!user) return null;

  return (
    <div className="app-page min-h-screen">
      <Header variant="app" />
      <main className="main-content page-container pb-32 pt-6 md:pb-12 md:pt-8">
        <header className="grid gap-5 rounded-3xl bg-[#241429] p-6 text-white shadow-soft-lg sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-fuchsia-200"><span className="material-symbols-outlined text-lg" aria-hidden="true">monitoring</span>Your wellbeing</span>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Notice patterns, not perfect days</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">See how mood, stress, sleep, energy, and life context have moved over time. These reflections support self-understanding; they are not a diagnosis.</p>
          </div>
          <Link href="/wellbeing" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-white shadow-primary-sm"><span className="material-symbols-outlined" aria-hidden="true">edit_note</span>{checkIns[0]?.localDate === today ? "Update today's check-in" : "Check in today"}</Link>
        </header>

        <div className="mt-5 flex max-w-full gap-2 overflow-x-auto rounded-2xl border border-border-light bg-white p-1.5 dark:border-border-dark dark:bg-card-dark sm:ml-auto sm:w-fit" aria-label="Pattern time range">
          {(Object.keys(PERIOD_DAYS) as Period[]).map((period) => (
            <button key={period} type="button" onClick={() => setSelectedPeriod(period)} aria-pressed={selectedPeriod === period} className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-bold transition ${selectedPeriod === period ? "bg-primary text-white" : "text-text-secondary hover:bg-primary/8"}`}>{PERIOD_LABELS[period]}</button>
          ))}
        </div>

        {error && <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">{error}</div>}

        {filteredCheckIns.length === 0 ? (
          <section className="mt-6 rounded-3xl border border-dashed border-primary/25 bg-primary/[0.03] p-8 text-center sm:p-12">
            <span className="material-symbols-outlined text-5xl text-primary" aria-hidden="true">psychiatry</span>
            <h2 className="mt-3 text-2xl font-black text-text-primary dark:text-white">Begin with one honest check-in</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-secondary">Choose words for what you feel, add context if useful, and decide whether you want reflection, coping ideas, or human support.</p>
            <Link href="/wellbeing" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-white">Open private check-in</Link>
          </section>
        ) : (
          <>
            <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryCard icon="event_note" value={String(filteredCheckIns.length)} label="Check-in days" helper={`Within ${PERIOD_LABELS[selectedPeriod]}`} showScale={false} />
              <SummaryCard icon="mood" value={averages.mood?.toFixed(1) || "—"} label="Average mood" helper={scoreLabel(averages.mood)} />
              <SummaryCard icon="psychology" value={averages.stress?.toFixed(1) || "—"} label="Average stress" helper={scoreLabel(averages.stress, true)} />
              <SummaryCard icon="bedtime" value={averages.sleep?.toFixed(1) || "—"} label="Average sleep" helper={scoreLabel(averages.sleep)} />
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
              <div className="rounded-3xl border border-border-light bg-white p-5 shadow-soft dark:border-border-dark dark:bg-card-dark sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div><span className="eyebrow">Daily view</span><h2 className="mt-1 text-xl font-black text-text-primary dark:text-white">Mood over time</h2><p className="mt-1 text-sm text-text-secondary">Tap a day to see what you recorded.</p></div>
                  <div className="flex gap-3 text-xs font-semibold text-text-secondary"><span>Mood 1–5</span><span>·</span><span>{chronological.length} entries</span></div>
                </div>
                <div className="mt-6 flex h-56 items-end gap-2 overflow-x-auto border-b border-border-light px-1 pb-2 dark:border-border-dark">
                  {chronological.map((entry) => {
                    const selected = selectedEntry?.id === entry.id;
                    return (
                      <button key={entry.id} type="button" aria-pressed={selected} aria-label={`${entry.localDate}, mood ${entry.mood} of 5`} onClick={() => setSelectedEntryId(entry.id)} className="group flex h-full min-w-14 flex-col items-center justify-end gap-2 rounded-xl px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <span className="text-xs font-black text-text-secondary">{entry.mood}</span>
                        <span className={`w-7 rounded-t-xl transition-all ${selected ? "bg-primary shadow-primary-sm" : "bg-primary/25 group-hover:bg-primary/50"}`} style={{ height: `${Math.max(18, entry.mood * 27)}px` }} />
                        <span className={`text-[10px] font-bold ${selected ? "text-primary" : "text-text-secondary"}`}>{entry.createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedEntry && <CheckInDetail entry={selectedEntry} />}
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-border-light bg-white p-5 shadow-soft dark:border-border-dark dark:bg-card-dark sm:p-6">
                <span className="eyebrow">Emotional vocabulary</span><h2 className="mt-1 text-xl font-black text-text-primary dark:text-white">Feelings you named</h2>
                {feelingCounts.length ? <div className="mt-5 space-y-3">{feelingCounts.slice(0, 6).map(([feeling, count]) => { const details = feelingDetails(feeling as WellbeingFeeling); const width = Math.max(10, (count / feelingCounts[0][1]) * 100); return <div key={feeling}><div className="mb-1.5 flex items-center justify-between text-sm"><span className="font-bold text-text-primary dark:text-white">{details?.emoji} {details?.label || feeling}</span><span className="text-text-secondary">{count} {count === 1 ? "day" : "days"}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-background-light dark:bg-background-dark"><div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} /></div></div>; })}</div> : <p className="mt-4 text-sm text-text-secondary">New check-ins will show the words you use most often.</p>}
              </div>

              <div className="rounded-3xl border border-border-light bg-white p-5 shadow-soft dark:border-border-dark dark:bg-card-dark sm:p-6">
                <span className="eyebrow">Gentle reflection</span><h2 className="mt-1 text-xl font-black text-text-primary dark:text-white">What stands out</h2>
                <div className="mt-4 space-y-3">{patternNotes.map((note) => <p key={note} className="flex gap-3 rounded-2xl bg-background-light p-4 text-sm leading-6 text-text-secondary dark:bg-background-dark"><span className="material-symbols-outlined mt-0.5 text-lg text-primary" aria-hidden="true">lightbulb</span><span>{note}</span></p>)}</div>
                <p className="mt-4 text-xs leading-5 text-text-secondary">These are simple summaries of what you recorded—not clinical conclusions or predictions.</p>
              </div>
            </section>
          </>
        )}

        <section className="mt-8 overflow-hidden rounded-3xl border border-border-light bg-white dark:border-border-dark dark:bg-card-dark">
          <div className="border-b border-border-light bg-background-light p-5 dark:border-border-dark dark:bg-background-dark sm:p-6">
            <span className="eyebrow">Body context</span><h2 className="mt-1 text-2xl font-black text-text-primary dark:text-white">Cycle and physical symptoms</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Kept here as supporting context. SisterCare does not assume every emotional change is caused by menstruation.</p>
          </div>
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[0.85fr_1.15fr]">
            {profile?.pregnancyData?.isPregnant ? (
              <div className="rounded-2xl bg-primary/[0.05] p-5"><p className="font-black text-text-primary dark:text-white">Period tracking is paused</p><p className="mt-2 text-sm leading-6 text-text-secondary">Your profile is currently using pregnancy support, so period statistics are not presented as active predictions.</p></div>
            ) : profile?.cycleData ? (
              <div className="grid grid-cols-2 gap-3"><Metric value={cycleSummary.cycle ? `${cycleSummary.cycle} days` : "—"} label="Typical cycle" /><Metric value={cycleSummary.period ? `${cycleSummary.period} days` : "—"} label="Typical period" /><Metric value={String(cycleSummary.count)} label="Completed cycles" /><Metric value={String(filteredSymptoms.length)} label="Symptom-log days" /></div>
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

function SummaryCard({ icon, value, label, helper, showScale = true }: { icon: string; value: string; label: string; helper: string; showScale?: boolean }) {
  return <article className="rounded-2xl border border-border-light bg-white p-4 shadow-soft dark:border-border-dark dark:bg-card-dark sm:p-5"><span className="material-symbols-outlined text-2xl text-primary" aria-hidden="true">{icon}</span><p className="mt-3 text-2xl font-black text-text-primary dark:text-white">{value}{showScale && <span className="ml-1 text-xs font-semibold text-text-secondary">/5</span>}</p><p className="mt-1 text-sm font-bold text-text-primary dark:text-white">{label}</p><p className="mt-1 text-xs text-text-secondary">{helper}</p></article>;
}

function CheckInDetail({ entry }: { entry: WellbeingCheckIn }) {
  const support = wellbeingSupportMessage(entry);
  return (
    <article className="rounded-3xl border border-primary/15 bg-primary/[0.04] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3"><div><span className="eyebrow">Selected day</span><h2 className="mt-1 text-xl font-black text-text-primary dark:text-white">{entry.createdAt.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h2></div><span className="rounded-xl bg-white px-2.5 py-1 text-xs font-black text-primary shadow-sm dark:bg-card-dark">Mood {entry.mood}/5</span></div>
      <div className="mt-4 flex flex-wrap gap-2">{(entry.feelings || []).map((feeling) => { const details = feelingDetails(feeling); return <span key={feeling} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-text-primary shadow-sm dark:bg-card-dark dark:text-white">{details?.emoji} {details?.label || feeling}</span>; })}</div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center"><Metric value={`${entry.stress}/5`} label="Stress" compact /><Metric value={`${entry.sleep}/5`} label="Sleep" compact /><Metric value={`${entry.energy}/5`} label="Energy" compact /></div>
      {(entry.contexts || []).length > 0 && <p className="mt-4 text-xs leading-5 text-text-secondary">Context: {(entry.contexts || []).map(contextLabel).join(", ")}</p>}
      {entry.note && <p className="mt-3 rounded-2xl bg-white p-3 text-sm leading-6 text-text-primary dark:bg-card-dark dark:text-gray-200">{entry.note}</p>}
      <div className="mt-4 border-t border-primary/10 pt-4"><p className="text-sm font-black text-text-primary dark:text-white">{support.title}</p><p className="mt-1 text-xs leading-5 text-text-secondary">{support.message}</p></div>
    </article>
  );
}

function Metric({ value, label, compact = false }: { value: string; label: string; compact?: boolean }) {
  return <div className={`rounded-2xl bg-background-light text-center dark:bg-background-dark ${compact ? "p-2.5" : "p-4"}`}><p className={`${compact ? "text-base" : "text-xl"} font-black text-text-primary dark:text-white`}>{value}</p><p className="mt-1 text-[11px] font-semibold text-text-secondary">{label}</p></div>;
}

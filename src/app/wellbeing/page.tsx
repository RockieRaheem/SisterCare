"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { AppShellSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import { submitOfflineCapableWrite } from "@/lib/offlineQueue";
import {
  localWellbeingDate,
  type WellbeingContext,
  type WellbeingFeeling,
  type WellbeingSupportNeed,
} from "@/lib/wellbeing";
import {
  CONTEXT_OPTIONS,
  PULSE_OPTIONS,
  SUPPORT_OPTIONS,
  contextLabel,
  feelingDetails,
  wellbeingSupportMessage,
} from "@/lib/wellbeingPresentation";
import type { WellbeingCheckIn } from "@/types";

const hydrate = (entry: WellbeingCheckIn): WellbeingCheckIn => ({
  ...entry,
  createdAt: new Date(entry.createdAt),
  updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : undefined,
});

export default function WellbeingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [history, setHistory] = useState<WellbeingCheckIn[]>([]);
  const [todayCheckIn, setTodayCheckIn] = useState<WellbeingCheckIn | null>(null);
  const [selectedFeeling, setSelectedFeeling] = useState<WellbeingFeeling | null>(null);
  const [contexts, setContexts] = useState<WellbeingContext[]>([]);
  const [supportNeed, setSupportNeed] = useState<WellbeingSupportNeed>("reflect");
  const [note, setNote] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const autoSavedQueryRef = useRef(false);
  const today = localWellbeingDate();

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;
    authenticatedFetch("/api/wellbeing", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Could not load check-ins.");
        const entries = (payload.data?.checkIns || []).map(hydrate);
        const existing = entries.find((entry: WellbeingCheckIn) => entry.localDate === today) || null;
        setHistory(entries);
        setTodayCheckIn(existing);
        if (existing) {
          setSelectedFeeling(existing.feelings?.[0] || null);
          setContexts(existing.contexts || []);
          setSupportNeed(existing.supportNeed || "reflect");
          setNote(existing.note || "");
        }
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Could not load check-ins."))
      .finally(() => setLoadingHistory(false));
  }, [today, user]);

  const persist = async (
    feeling: WellbeingFeeling,
    details?: {
      contexts?: WellbeingContext[];
      supportNeed?: WellbeingSupportNeed;
      note?: string;
    },
  ) => {
    if (!user || busy) return;
    setBusy(true);
    setSelectedFeeling(feeling);
    setMessage(null);
    try {
      const nextContexts = details?.contexts ?? contexts;
      const nextSupport = details?.supportNeed ?? supportNeed;
      const nextNote = details?.note ?? note;
      const result = await submitOfflineCapableWrite({
        userId: user.uid,
        url: "/api/wellbeing",
        body: {
          localDate: today,
          feelings: [feeling],
          contexts: nextContexts,
          supportNeed: nextSupport,
          note: nextNote,
        },
      });
      const checkIn =
        result.state === "synced"
          ? hydrate((result.payload.data as { checkIn: WellbeingCheckIn }).checkIn)
          : ({
              id: todayCheckIn?.id || result.localId,
              mood: ["content", "calm"].includes(feeling) ? 4 : feeling === "tired" ? 3 : feeling === "overwhelmed" ? 1 : 2,
              localDate: today,
              feelings: [feeling],
              contexts: nextContexts,
              supportNeed: nextSupport,
              ...(nextNote.trim() ? { note: nextNote.trim() } : {}),
              createdAt: todayCheckIn?.createdAt || new Date(),
              updatedAt: new Date(),
            } as WellbeingCheckIn);
      setTodayCheckIn(checkIn);
      setHistory((current) => [checkIn, ...current.filter((entry) => entry.localDate !== today)].slice(0, 90));
      setMessage(
        result.state === "synced"
          ? todayCheckIn
            ? "Today's pulse was updated."
            : "You're checked in for today."
          : "Saved on this device. SisterCare will sync it when you are online.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save today's pulse.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (loadingHistory || !user || autoSavedQueryRef.current || todayCheckIn) return;
    const requested = new URLSearchParams(window.location.search).get("feeling") as WellbeingFeeling | null;
    if (!requested || !PULSE_OPTIONS.some((option) => option.value === requested)) return;
    autoSavedQueryRef.current = true;
    void persist(requested);
    // `persist` deliberately runs only once for the explicit one-tap URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingHistory, todayCheckIn, user]);

  const support = useMemo(
    () => (todayCheckIn ? wellbeingSupportMessage(todayCheckIn) : null),
    [todayCheckIn],
  );

  const toggleContext = (value: WellbeingContext) => {
    setContexts((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : current.length < 3
          ? [...current, value]
          : current,
    );
  };

  if (loading || (user && loadingHistory)) return <AppShellSkeleton />;
  if (!user) return null;

  return (
    <div className="app-page">
      <Header variant="app" />
      <main id="main-content" className="main-content pb-32 md:pb-12">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-10">
          <header className="overflow-hidden rounded-3xl bg-[#241429] p-6 text-white shadow-soft-lg sm:p-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold"><span className="material-symbols-outlined text-base" aria-hidden="true">lock</span>Private daily pulse</span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">How does today feel?</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">One tap is enough. SisterCare keeps one pulse for the day and offers support that matches what you choose.</p>
          </header>

          <section className="relative z-10 mx-auto -mt-5 max-w-4xl rounded-3xl border border-border-light bg-white p-5 shadow-soft-lg dark:border-border-dark dark:bg-card-dark sm:p-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div><span className="eyebrow">Today</span><h2 className="mt-1 text-2xl font-black text-text-primary dark:text-white">Pick what feels closest</h2></div>
              <p className="text-xs font-semibold text-text-secondary">Tap again anytime to update today</p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PULSE_OPTIONS.map((option) => {
                const selected = selectedFeeling === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    disabled={busy}
                    onClick={() => void persist(option.value)}
                    className={`group min-h-24 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? "border-primary bg-primary/10 shadow-primary-sm" : "border-border-light bg-background-light hover:border-primary/40 hover:bg-primary/[0.04] dark:border-border-dark dark:bg-background-dark"} disabled:cursor-wait disabled:opacity-60`}
                  >
                    <span className="text-3xl" aria-hidden="true">{option.emoji}</span>
                    <span className="mt-2 block text-base font-black text-text-primary dark:text-white">{option.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-text-secondary">{option.prompt}</span>
                  </button>
                );
              })}
            </div>
            {busy && <p role="status" className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary"><span className="material-symbols-outlined animate-spin text-lg" aria-hidden="true">progress_activity</span>Saving your pulse…</p>}
            {message && !busy && <p role="status" className="mt-3 rounded-xl bg-background-light p-3 text-sm font-semibold text-text-secondary dark:bg-background-dark">{message}</p>}
          </section>

          {todayCheckIn && support && (
            <section className={`mx-auto mt-5 max-w-4xl rounded-3xl border p-5 sm:p-6 ${support.tone === "support" ? "border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/25" : support.tone === "care" ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20" : "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20"}`}>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-xl"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-text-secondary">Your update</p><h2 className="mt-1 text-xl font-black text-text-primary dark:text-white">{support.title}</h2><p className="mt-2 text-sm leading-6 text-text-secondary">{support.message}</p></div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link href="/chat" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white"><span className="material-symbols-outlined text-lg" aria-hidden="true">chat_bubble</span>Talk privately</Link>
                  <Link href="/counsellors" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/20 bg-white px-4 text-sm font-bold text-primary dark:bg-card-dark"><span className="material-symbols-outlined text-lg" aria-hidden="true">support_agent</span>Counsellors</Link>
                </div>
              </div>
              {selectedFeeling === "overwhelmed" && <p className="mt-4 rounded-xl bg-white/70 p-3 text-xs font-semibold leading-5 text-rose-900 dark:bg-black/15 dark:text-rose-100">If you may hurt yourself or someone else, or you are in immediate danger, contact local emergency help or a trusted person near you now.</p>}
            </section>
          )}

          {todayCheckIn && (
            <section className="mx-auto mt-5 max-w-4xl rounded-3xl border border-border-light bg-white p-5 dark:border-border-dark dark:bg-card-dark sm:p-6">
              <button type="button" onClick={() => setShowDetails((value) => !value)} aria-expanded={showDetails} className="flex min-h-12 w-full items-center justify-between gap-4 text-left">
                <span><span className="block font-black text-text-primary dark:text-white">Want to add more?</span><span className="mt-1 block text-xs text-text-secondary">Optional context can make your patterns more useful.</span></span>
                <span className="material-symbols-outlined text-primary" aria-hidden="true">{showDetails ? "expand_less" : "expand_more"}</span>
              </button>
              {showDetails && (
                <div className="mt-5 border-t border-border-light pt-5 dark:border-border-dark">
                  <h3 className="text-sm font-black text-text-primary dark:text-white">What is affecting you? <span className="font-normal text-text-secondary">Choose up to three</span></h3>
                  <div className="mt-3 flex flex-wrap gap-2">{CONTEXT_OPTIONS.map((option) => { const selected = contexts.includes(option.value); return <button key={option.value} type="button" aria-pressed={selected} disabled={contexts.length >= 3 && !selected} onClick={() => toggleContext(option.value)} className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${selected ? "border-primary bg-primary text-white" : "border-border-light text-text-secondary dark:border-border-dark"} disabled:opacity-40`}><span className="material-symbols-outlined text-lg" aria-hidden="true">{option.icon}</span>{option.label}</button>; })}</div>
                  <h3 className="mt-6 text-sm font-black text-text-primary dark:text-white">What would help next?</h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">{SUPPORT_OPTIONS.map((option) => <button key={option.value} type="button" aria-pressed={supportNeed === option.value} onClick={() => setSupportNeed(option.value)} className={`flex items-start gap-3 rounded-2xl border p-3 text-left ${supportNeed === option.value ? "border-primary bg-primary/10" : "border-border-light dark:border-border-dark"}`}><span className="material-symbols-outlined text-xl text-primary" aria-hidden="true">{option.icon}</span><span><span className="block text-sm font-bold text-text-primary dark:text-white">{option.label}</span><span className="block text-xs text-text-secondary">{option.description}</span></span></button>)}</div>
                  <label htmlFor="wellbeing-note" className="mt-6 block text-sm font-black text-text-primary dark:text-white">Private note <span className="font-normal text-text-secondary">(optional)</span></label>
                  <textarea id="wellbeing-note" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="What happened, what you need, or what helped" className="mt-2 min-h-24 w-full rounded-2xl border border-border-light bg-background-light px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-border-dark dark:bg-background-dark" />
                  <button type="button" disabled={busy || !selectedFeeling} onClick={() => selectedFeeling && void persist(selectedFeeling, { contexts, supportNeed, note })} className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-white disabled:opacity-50 sm:w-auto">Save optional details</button>
                </div>
              )}
            </section>
          )}

          <section className="mx-auto mt-8 max-w-4xl">
            <div className="flex items-end justify-between gap-4"><div><span className="eyebrow">Your private record</span><h2 className="mt-1 text-2xl font-black text-text-primary dark:text-white">Recent days</h2></div><Link href="/analytics" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary">See patterns <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span></Link></div>
            {history.length === 0 ? <p className="mt-4 rounded-2xl border border-dashed border-border-light p-6 text-sm text-text-secondary dark:border-border-dark">Your first pulse will appear here.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{history.slice(0, 6).map((entry) => { const feeling = entry.feelings?.[0]; const details = feeling ? feelingDetails(feeling) : null; return <article key={entry.id} className="rounded-2xl border border-border-light bg-white p-4 dark:border-border-dark dark:bg-card-dark"><div className="flex items-center gap-3"><span className="text-2xl" aria-hidden="true">{details?.emoji || "•"}</span><div className="min-w-0"><p className="font-black text-text-primary dark:text-white">{details?.label || "Earlier check-in"}</p><time className="text-xs text-text-secondary">{entry.localDate === today ? "Today" : entry.createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time></div></div>{(entry.contexts || []).length > 0 && <p className="mt-3 text-xs text-text-secondary">Around {(entry.contexts || []).map(contextLabel).join(", ")}</p>}{entry.note && <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-primary dark:text-gray-200">{entry.note}</p>}</article>; })}</div>}
          </section>
        </div>
      </main>
    </div>
  );
}

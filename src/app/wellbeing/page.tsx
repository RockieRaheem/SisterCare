"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import WellbeingPulsePicker from "@/components/features/WellbeingPulsePicker";
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
  pulseDetails,
  wellbeingSupportMessage,
} from "@/lib/wellbeingPresentation";
import type { WellbeingCheckIn } from "@/types";

const hydrate = (entry: WellbeingCheckIn): WellbeingCheckIn => ({
  ...entry,
  createdAt: new Date(entry.createdAt),
  updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : undefined,
});

const pulseMood = (feeling: WellbeingFeeling) =>
  ["content", "calm"].includes(feeling)
    ? 4
    : feeling === "tired"
      ? 3
      : feeling === "overwhelmed"
        ? 1
        : 2;

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
  const [showNote, setShowNote] = useState(false);
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
        if (!response.ok) throw new Error(payload.error || "Could not load your check-ins.");
        const entries = (payload.data?.checkIns || []).map(hydrate);
        const existing = entries.find((entry: WellbeingCheckIn) => entry.localDate === today) || null;
        setHistory(entries);
        setTodayCheckIn(existing);
        if (existing) {
          setSelectedFeeling(existing.feelings?.[0] || null);
          setContexts(existing.contexts || []);
          setSupportNeed(existing.supportNeed || "reflect");
          setNote(existing.note || "");
          setShowNote(Boolean(existing.note));
        }
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Could not load your check-ins."))
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
              mood: pulseMood(feeling),
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
      setMessage(result.state === "synced" ? "Saved for today" : "Saved here. It will sync when you are online.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your check-in could not be saved.");
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
    // This compatibility link is intentionally handled once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingHistory, todayCheckIn, user]);

  const support = useMemo(
    () => (todayCheckIn ? wellbeingSupportMessage(todayCheckIn) : null),
    [todayCheckIn],
  );
  const selectedDetails = selectedFeeling ? pulseDetails(selectedFeeling) : null;

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
      <main className="main-content pb-28 md:pb-12">
        <div className="mx-auto w-full max-w-4xl px-3 pb-8 pt-4 sm:px-6 sm:pt-8">
          <header className="px-1 sm:text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/[0.05] px-3 py-1.5 text-xs font-bold text-primary">
              <span className="material-symbols-outlined text-base" aria-hidden="true">lock</span>
              Private daily check-in
            </div>
            <h1 className="mt-4 text-[2rem] font-black leading-tight tracking-[-0.045em] text-text-primary dark:text-white sm:text-4xl">How are you holding up today?</h1>
            <p className="mt-2 text-sm leading-6 text-text-secondary sm:text-base">No scores. No long form. Choose what feels closest.</p>
          </header>

          <section className="mt-5 rounded-[26px] border border-border-light bg-background-light p-3 shadow-soft dark:border-border-dark dark:bg-background-dark sm:p-5">
            <WellbeingPulsePicker selected={selectedFeeling} busy={busy} onSelect={(feeling) => void persist(feeling)} />
            <div className="mt-3 flex min-h-6 items-center justify-center gap-2 text-center text-xs font-semibold text-text-secondary" aria-live="polite">
              {busy ? <><span className="material-symbols-outlined animate-spin text-base text-primary" aria-hidden="true">progress_activity</span>Saving gently…</> : message ? <><span className="material-symbols-outlined text-base text-primary" aria-hidden="true">check_circle</span>{message}</> : "One tap saves today. Tap another feeling if it changes."}
            </div>
          </section>

          {todayCheckIn && support && (
            <section className="mt-4 overflow-hidden rounded-[26px] border border-primary/15 bg-white shadow-soft dark:border-primary/25 dark:bg-card-dark">
              <div className="p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.08] text-3xl" aria-hidden="true">{selectedDetails?.emoji || "♡"}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">Today feels {selectedDetails?.label?.toLowerCase() || "noted"}</p>
                    <h2 className="mt-1 text-xl font-black leading-tight text-text-primary dark:text-white">{support.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">{support.message}</p>
                  </div>
                </div>

                {selectedFeeling === "overwhelmed" && (
                  <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-100">If you may hurt yourself or someone else, or you are in immediate danger, contact local emergency help or a trusted person near you now.</p>
                )}

                <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Link href="/chat" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-extrabold text-white shadow-primary-sm"><span className="material-symbols-outlined text-xl" aria-hidden="true">chat_bubble</span>Talk privately</Link>
                  <Link href="/counsellors" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-white px-4 text-sm font-extrabold text-primary dark:bg-card-dark"><span className="material-symbols-outlined text-xl" aria-hidden="true">support_agent</span>Human support</Link>
                </div>

                <button type="button" onClick={() => setShowDetails((value) => !value)} aria-expanded={showDetails} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-text-secondary hover:bg-background-light dark:hover:bg-background-dark">
                  <span className="material-symbols-outlined text-lg text-primary" aria-hidden="true">add_circle</span>
                  {showDetails ? "Close optional details" : "Add what is behind this"}
                </button>
              </div>

              {showDetails && (
                <div className="border-t border-border-light bg-background-light p-4 dark:border-border-dark dark:bg-background-dark sm:p-6">
                  <div>
                    <h3 className="text-base font-black text-text-primary dark:text-white">What is sitting with you?</h3>
                    <p className="mt-1 text-xs text-text-secondary">Optional · choose up to three</p>
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
                      {CONTEXT_OPTIONS.map((option) => {
                        const active = contexts.includes(option.value);
                        return (
                          <button key={option.value} type="button" aria-pressed={active} disabled={contexts.length >= 3 && !active} onClick={() => toggleContext(option.value)} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition ${active ? "border-primary bg-primary text-white" : "border-border-light bg-white text-text-secondary dark:border-border-dark dark:bg-card-dark"} disabled:opacity-40`}>
                            <span className="material-symbols-outlined text-lg" aria-hidden="true">{option.icon}</span>{option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-base font-black text-text-primary dark:text-white">What would help now?</h3>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {SUPPORT_OPTIONS.map((option) => (
                        <button key={option.value} type="button" aria-pressed={supportNeed === option.value} onClick={() => setSupportNeed(option.value)} className={`min-h-[76px] rounded-2xl border p-3 text-left transition ${supportNeed === option.value ? "border-primary bg-primary/[0.08]" : "border-border-light bg-white dark:border-border-dark dark:bg-card-dark"}`}>
                          <span className="material-symbols-outlined text-xl text-primary" aria-hidden="true">{option.icon}</span>
                          <span className="mt-1 block text-xs font-extrabold text-text-primary dark:text-white">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="button" onClick={() => setShowNote((value) => !value)} aria-expanded={showNote} className="mt-5 flex min-h-11 items-center gap-2 text-sm font-bold text-primary"><span className="material-symbols-outlined text-lg" aria-hidden="true">edit_note</span>{showNote ? "Hide private note" : "Write a private note"}</button>
                  {showNote && <textarea value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="Write only what feels useful…" className="mt-2 min-h-24 w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-border-dark dark:bg-card-dark" />}
                  <button type="button" disabled={busy || !selectedFeeling} onClick={() => selectedFeeling && void persist(selectedFeeling, { contexts, supportNeed, note })} className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-extrabold text-white shadow-primary-sm disabled:opacity-50 sm:w-auto">Save these details</button>
                </div>
              )}
            </section>
          )}

          <section className="mt-7 rounded-[26px] border border-border-light bg-white p-4 dark:border-border-dark dark:bg-card-dark sm:p-6">
            <div className="flex items-end justify-between gap-3">
              <div><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">Your week</p><h2 className="mt-1 text-xl font-black text-text-primary dark:text-white">A quiet record, just for you</h2></div>
              <Link href="/analytics" className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-bold text-primary">Patterns <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span></Link>
            </div>
            {history.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-border-light p-5 text-sm leading-6 text-text-secondary dark:border-border-dark">After your first pulse, this becomes a simple emotional timeline—not another task list.</p>
            ) : (
              <div className="mt-5 grid grid-cols-7 gap-1.5" aria-label="Recent emotional check-ins">
                {[...history].slice(0, 7).reverse().map((entry) => {
                  const details = entry.feelings?.[0] ? pulseDetails(entry.feelings[0]) : null;
                  return (
                    <article key={entry.id} title={`${entry.localDate}: ${details?.label || "check-in"}`} className={`flex min-w-0 flex-col items-center rounded-xl px-1 py-2.5 ${entry.localDate === today ? "bg-primary/[0.08] ring-1 ring-primary/20" : "bg-background-light dark:bg-background-dark"}`}>
                      <span className="text-xl" aria-hidden="true">{details?.emoji || "•"}</span>
                      <time className="mt-1 truncate text-[9px] font-bold uppercase text-text-secondary">{entry.createdAt.toLocaleDateString(undefined, { weekday: "narrow" })}</time>
                    </article>
                  );
                })}
              </div>
            )}
            {history[0]?.contexts?.length ? <p className="mt-4 text-xs leading-5 text-text-secondary">Recently connected to {history[0].contexts.map(contextLabel).join(", ")}.</p> : null}
          </section>
        </div>
      </main>
    </div>
  );
}

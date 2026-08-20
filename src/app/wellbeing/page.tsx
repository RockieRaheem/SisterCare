"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import WellbeingPulsePicker from "@/components/features/WellbeingPulsePicker";
import WellbeingCareChoices from "@/components/features/WellbeingCareChoices";
import Header from "@/components/layout/Header";
import { AppShellSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import {
  listQueuedWrites,
  OFFLINE_QUEUE_CHANGE_EVENT,
  queuedWriteMessage,
} from "@/lib/offlineQueue";
import { getWellbeingCheckIns, submitWellbeingCheckIn } from "@/lib/wellbeingClient";
import {
  localWellbeingDate,
  type WellbeingContext,
  type WellbeingFeeling,
  type WellbeingSupportNeed,
} from "@/lib/wellbeing";
import {
  CONTEXT_OPTIONS,
  PULSE_OPTIONS,
  pulseDetails,
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
  const [pendingWriteId, setPendingWriteId] = useState<string | null>(null);
  const autoSavedQueryRef = useRef(false);
  const today = localWellbeingDate();

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;
    getWellbeingCheckIns(user.uid)
      .then((entries) => {
        const existing = entries.find((entry: WellbeingCheckIn) => entry.localDate === today) || null;
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
      followUpAt?: string | null;
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
      const followUpChanged = details && Object.prototype.hasOwnProperty.call(details, "followUpAt");
      const nextFollowUpAt = followUpChanged ? details.followUpAt || undefined : todayCheckIn?.followUpAt;
      const nextFollowUpDeliveredAt = followUpChanged ? undefined : todayCheckIn?.followUpDeliveredAt;
      const result = await submitWellbeingCheckIn(user.uid, {
          localDate: today,
          feelings: [feeling],
          contexts: nextContexts,
          supportNeed: nextSupport,
          note: nextNote,
          followUpAt: nextFollowUpAt,
          followUpDeliveredAt: nextFollowUpDeliveredAt,
      });
      const checkIn =
        result.state === "synced"
          ? result.checkIn
          : ({
              id: todayCheckIn?.id || result.localId,
              localDate: today,
              feelings: [feeling],
              contexts: nextContexts,
              supportNeed: nextSupport,
              ...(nextNote.trim() ? { note: nextNote.trim() } : {}),
              ...(nextFollowUpAt ? { followUpAt: nextFollowUpAt } : {}),
              ...(nextFollowUpDeliveredAt ? { followUpDeliveredAt: nextFollowUpDeliveredAt } : {}),
              createdAt: todayCheckIn?.createdAt || new Date(),
              updatedAt: new Date(),
            } as WellbeingCheckIn);
      setTodayCheckIn(checkIn);
      setPendingWriteId(result.state === "queued" ? result.localId : null);
      setMessage(result.state === "synced" ? "Saved for today" : queuedWriteMessage(result.reason));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your check-in could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!user || !pendingWriteId) return;
    const refreshSyncState = async () => {
      const pending = await listQueuedWrites(user.uid).catch(() => []);
      if (!pending.some((entry) => entry.id === pendingWriteId)) {
        setPendingWriteId(null);
        setMessage("Saved for today");
      }
    };
    window.addEventListener(OFFLINE_QUEUE_CHANGE_EVENT, refreshSyncState);
    return () => window.removeEventListener(OFFLINE_QUEUE_CHANGE_EVENT, refreshSyncState);
  }, [pendingWriteId, user]);

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

  const scheduleFollowUp = (hours: number | null) => {
    if (!selectedFeeling) return;
    const followUpAt = hours === null
      ? null
      : new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    void persist(selectedFeeling, { contexts, supportNeed, note, followUpAt });
  };

  if (loading || (user && loadingHistory)) return <AppShellSkeleton />;
  if (!user) return null;

  return (
    <div className="app-page">
      <Header variant="app" />
      <main className="main-content pb-28 md:pb-12">
        <div className="mx-auto w-full max-w-4xl px-3 pb-8 pt-4 sm:px-6 sm:pt-8">
          <header className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-white p-5 text-text-primary shadow-soft-lg dark:border-primary/30 dark:bg-card-dark dark:text-white sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-2xl" aria-hidden="true" />
            <div className="relative inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-xs font-bold text-primary">
              <span className="material-symbols-outlined text-base" aria-hidden="true">lock</span>
              Your private wellbeing space
            </div>
            <h1 className="relative mt-4 max-w-2xl text-[2rem] font-black leading-tight tracking-[-0.045em] sm:text-4xl">Start with what you need—not a questionnaire.</h1>
            <p className="relative mt-3 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base">Talk about what happened, steady a difficult moment, reach a verified person, or leave one private word for later.</p>
            <div className="relative mt-5 flex flex-wrap gap-2 text-[11px] font-bold text-text-secondary">
              {[
                ["check_circle", "No scores or streaks"],
                ["visibility_off", "Private by default"],
                ["tune", "You choose the next step"],
              ].map(([icon, label]) => (
                <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-primary/[0.06] px-3 py-2"><span className="material-symbols-outlined text-sm text-primary" aria-hidden="true">{icon}</span>{label}</span>
              ))}
            </div>
          </header>

          <section className="mt-5 rounded-[26px] border border-primary/15 bg-white p-4 shadow-soft dark:border-primary/25 dark:bg-card-dark sm:p-6">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-white">1</span>
              <div><h2 className="text-lg font-black text-text-primary dark:text-white">Choose support for this moment</h2><p className="mt-1 text-xs leading-5 text-text-secondary">Nothing is saved just because you open one of these options.</p></div>
            </div>
            <WellbeingCareChoices />
          </section>

          <section className="mt-4 rounded-[26px] border border-border-light bg-background-light p-3 shadow-soft dark:border-border-dark dark:bg-background-dark sm:p-5">
            <div className="mb-4 flex items-start gap-3 px-1">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-white text-sm font-black text-primary dark:bg-card-dark">2</span>
              <div><h2 className="text-lg font-black text-text-primary dark:text-white">Or save one word for today</h2>
              <p className="mt-1 text-xs leading-5 text-text-secondary">Useful when talking feels difficult. Choose one feeling now; edit or add context only if you want to.</p></div>
            </div>
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
                     <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">Your check-in today · {selectedDetails?.label?.toLowerCase() || "noted"}</p>
                    <h2 className="mt-1 text-xl font-black leading-tight text-text-primary dark:text-white">{support.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">{support.message}</p>
                  </div>
                </div>

                {selectedFeeling === "overwhelmed" && (
                  <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-100">If you may hurt yourself or someone else, or you are in immediate danger, contact local emergency help or a trusted person near you now.</p>
                )}

                <div className="mt-4 rounded-2xl border border-border-light bg-background-light p-4 dark:border-border-dark dark:bg-background-dark">
                  <p className="text-sm font-black text-text-primary dark:text-white">Would you like SisterCare to check back?</p>
                  <p className="mt-1 text-xs leading-5 text-text-secondary">Only set this if you want it. The notification will not include what you wrote or how you felt.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => scheduleFollowUp(4)} className="min-h-11 rounded-xl border border-primary/25 bg-white px-4 text-sm font-bold text-primary dark:bg-card-dark">Later today</button>
                    <button type="button" disabled={busy} onClick={() => scheduleFollowUp(24)} className="min-h-11 rounded-xl border border-primary/25 bg-white px-4 text-sm font-bold text-primary dark:bg-card-dark">Tomorrow</button>
                    {todayCheckIn.followUpAt && !todayCheckIn.followUpDeliveredAt ? (
                      <button type="button" disabled={busy} onClick={() => scheduleFollowUp(null)} className="min-h-11 px-3 text-sm font-bold text-text-secondary">Remove follow-up</button>
                    ) : null}
                  </div>
                  {todayCheckIn.followUpAt && !todayCheckIn.followUpDeliveredAt ? (
                    <p className="mt-2 text-xs font-semibold text-text-secondary">Requested for {new Date(todayCheckIn.followUpAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}.</p>
                  ) : null}
                </div>

                <button type="button" onClick={() => setShowDetails((value) => !value)} aria-expanded={showDetails} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-text-secondary hover:bg-background-light dark:hover:bg-background-dark">
                  <span className="material-symbols-outlined text-lg text-primary" aria-hidden="true">add_circle</span>
                  {showDetails ? "Close personal details" : "Add to my private check-in"}
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

                  <button type="button" onClick={() => setShowNote((value) => !value)} aria-expanded={showNote} className="mt-5 flex min-h-11 items-center gap-2 text-sm font-bold text-primary"><span className="material-symbols-outlined text-lg" aria-hidden="true">edit_note</span>{showNote ? "Hide private note" : "Write a private note"}</button>
                  {showNote && <textarea value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="Write only what feels useful…" className="mt-2 min-h-24 w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-border-dark dark:bg-card-dark" />}
                  <button type="button" disabled={busy || !selectedFeeling} onClick={() => selectedFeeling && void persist(selectedFeeling, { contexts, supportNeed, note })} className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-extrabold text-white shadow-primary-sm disabled:opacity-50 sm:w-auto">Save these details</button>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

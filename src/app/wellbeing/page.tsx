"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { AppShellSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import { submitOfflineCapableWrite } from "@/lib/offlineQueue";
import {
  localWellbeingDate,
  WellbeingContext,
  WellbeingFeeling,
  WellbeingSupportNeed,
} from "@/lib/wellbeing";
import {
  CONTEXT_OPTIONS,
  FEELING_OPTIONS,
  SCORE_AREAS,
  SUPPORT_OPTIONS,
  contextLabel,
  feelingDetails,
  wellbeingSupportMessage,
} from "@/lib/wellbeingPresentation";
import { WellbeingCheckIn } from "@/types";

type ScoreKey = (typeof SCORE_AREAS)[number]["key"];
type Scores = Record<ScoreKey, number | null>;
const EMPTY_SCORES: Scores = { mood: null, stress: null, sleep: null, energy: null };

const hydrate = (entry: WellbeingCheckIn): WellbeingCheckIn => ({
  ...entry,
  createdAt: new Date(entry.createdAt),
  updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : undefined,
});

export default function WellbeingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [scores, setScores] = useState<Scores>(EMPTY_SCORES);
  const [feelings, setFeelings] = useState<WellbeingFeeling[]>([]);
  const [contexts, setContexts] = useState<WellbeingContext[]>([]);
  const [supportNeed, setSupportNeed] = useState<WellbeingSupportNeed>("reflect");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<WellbeingCheckIn[]>([]);
  const [todayCheckIn, setTodayCheckIn] = useState<WellbeingCheckIn | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
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
          setScores({ mood: existing.mood, stress: existing.stress, sleep: existing.sleep, energy: existing.energy });
          setFeelings(existing.feelings || []);
          setContexts(existing.contexts || []);
          setSupportNeed(existing.supportNeed || "reflect");
          setNote(existing.note || "");
        } else {
          const requested = new URLSearchParams(window.location.search).get("feeling") as WellbeingFeeling | null;
          if (requested && FEELING_OPTIONS.some((option) => option.value === requested)) {
            setFeelings([requested]);
          }
        }
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Could not load check-ins."))
      .finally(() => setLoadingHistory(false));
  }, [today, user]);

  const complete = Object.values(scores).every((value) => value !== null) && feelings.length > 0;
  const preview = useMemo<WellbeingCheckIn | null>(() => {
    if (!complete) return null;
    return {
      id: todayCheckIn?.id || "preview",
      mood: scores.mood as number,
      stress: scores.stress as number,
      sleep: scores.sleep as number,
      energy: scores.energy as number,
      localDate: today,
      feelings,
      contexts,
      supportNeed,
      ...(note.trim() ? { note: note.trim() } : {}),
      createdAt: todayCheckIn?.createdAt || new Date(),
    };
  }, [complete, contexts, feelings, note, scores, supportNeed, today, todayCheckIn]);
  const support = preview ? wellbeingSupportMessage(preview) : null;

  const toggleFeeling = (value: WellbeingFeeling) => {
    setFeelings((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : current.length < 3
          ? [...current, value]
          : current,
    );
  };

  const toggleContext = (value: WellbeingContext) => {
    setContexts((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : current.length < 3
          ? [...current, value]
          : current,
    );
  };

  const save = async () => {
    if (!user || !complete) {
      setMessage("Choose at least one feeling and one response for every wellbeing area.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await submitOfflineCapableWrite({
        userId: user.uid,
        url: "/api/wellbeing",
        body: {
          mood: scores.mood as number,
          stress: scores.stress as number,
          sleep: scores.sleep as number,
          energy: scores.energy as number,
          localDate: today,
          feelings,
          contexts,
          supportNeed,
          note,
        },
      });
      const checkIn =
        result.state === "synced"
          ? hydrate((result.payload.data as { checkIn: WellbeingCheckIn }).checkIn)
          : ({
              id: todayCheckIn?.id || result.localId,
              mood: scores.mood as number,
              stress: scores.stress as number,
              sleep: scores.sleep as number,
              energy: scores.energy as number,
              localDate: today,
              feelings,
              contexts,
              supportNeed,
              ...(note.trim() ? { note: note.trim() } : {}),
              createdAt: todayCheckIn?.createdAt || new Date(),
              updatedAt: new Date(),
            } as WellbeingCheckIn);
      setTodayCheckIn(checkIn);
      setHistory((current) => [checkIn, ...current.filter((entry) => entry.localDate !== today)].slice(0, 30));
      setMessage(
        result.state === "synced"
          ? todayCheckIn
            ? "Today's check-in was updated."
            : "Today's private check-in was saved."
          : "Saved on this device. SisterCare will synchronize it once you are online.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this check-in.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || (user && loadingHistory)) return <AppShellSkeleton />;
  if (!user) return null;

  return (
    <div className="app-page">
      <Header variant="app" />
      <main id="main-content" className="main-content pb-32 md:pb-12">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-10">
          <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#29172f] via-[#44204c] to-primary p-6 text-white shadow-soft-lg sm:p-8">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-bold">
                <span className="material-symbols-outlined text-base" aria-hidden="true">lock</span>
                One private check-in a day
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">How are you, really?</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
                Name what is present, notice what may be affecting you, and choose the support you want. There are no streaks, scores to beat, or judgments.
              </p>
              {todayCheckIn && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#44204c]">
                  <span className="material-symbols-outlined text-base" aria-hidden="true">check_circle</span>
                  You checked in today · changes will update the same entry
                </p>
              )}
            </div>
          </header>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <section className="rounded-3xl border border-border-light bg-white p-5 shadow-soft dark:border-border-dark dark:bg-card-dark sm:p-7">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">1 · Name it</p>
                <h2 className="mt-1 text-xl font-black text-text-primary dark:text-white">What feelings fit right now?</h2>
                <p className="mt-1 text-sm text-text-secondary">Choose up to three. Words often say more than one face can.</p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {FEELING_OPTIONS.map((option) => {
                    const selected = feelings.includes(option.value);
                    const capped = feelings.length >= 3 && !selected;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        disabled={capped}
                        onClick={() => toggleFeeling(option.value)}
                        className={`min-h-20 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border-light bg-background-light text-text-primary hover:border-primary/35 dark:border-border-dark dark:bg-background-dark dark:text-white"
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        <span className="block text-2xl" aria-hidden="true">{option.emoji}</span>
                        <span className="mt-1 block text-sm font-bold">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 border-t border-border-light pt-7 dark:border-border-dark">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">2 · Notice it</p>
                <h2 className="mt-1 text-xl font-black text-text-primary dark:text-white">A quick view of today</h2>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  {SCORE_AREAS.map((area) => (
                    <fieldset key={area.key} className="rounded-2xl bg-background-light p-4 dark:bg-background-dark">
                      <legend className="flex items-center gap-2 px-1 text-sm font-bold text-text-primary dark:text-white">
                        <span className="material-symbols-outlined text-lg text-primary" aria-hidden="true">{area.icon}</span>
                        {area.label}
                      </legend>
                      <div className="mt-3 grid grid-cols-5 gap-1.5">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            aria-label={`${area.label}: ${value} of 5`}
                            aria-pressed={scores[area.key] === value}
                            onClick={() => setScores((current) => ({ ...current, [area.key]: value }))}
                            className={`min-h-11 rounded-xl border text-sm font-black transition ${
                              scores[area.key] === value
                                ? "border-primary bg-primary text-white"
                                : "border-border-light bg-white text-text-secondary hover:border-primary/50 dark:border-border-dark dark:bg-card-dark dark:text-gray-300"
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 flex justify-between text-[11px] font-medium text-text-secondary"><span>{area.low}</span><span>{area.high}</span></div>
                    </fieldset>
                  ))}
                </div>
              </div>

              <div className="mt-8 border-t border-border-light pt-7 dark:border-border-dark">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">3 · Add context</p>
                <h2 className="mt-1 text-xl font-black text-text-primary dark:text-white">What may be affecting you?</h2>
                <p className="mt-1 text-sm text-text-secondary">Optional · choose up to three</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {CONTEXT_OPTIONS.map((option) => {
                    const selected = contexts.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        disabled={contexts.length >= 3 && !selected}
                        onClick={() => toggleContext(option.value)}
                        className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
                          selected
                            ? "border-primary bg-primary text-white"
                            : "border-border-light bg-white text-text-secondary hover:border-primary/40 dark:border-border-dark dark:bg-background-dark dark:text-gray-300"
                        } disabled:opacity-40`}
                      >
                        <span className="material-symbols-outlined text-lg" aria-hidden="true">{option.icon}</span>{option.label}
                      </button>
                    );
                  })}
                </div>
                <label className="mt-6 block text-sm font-bold text-text-primary dark:text-white" htmlFor="wellbeing-note">Anything you want to remember? <span className="font-normal text-text-secondary">(optional)</span></label>
                <textarea
                  id="wellbeing-note"
                  value={note}
                  maxLength={500}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="A private note about what happened, what you need, or what helped"
                  className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-border-light bg-background-light px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-border-dark dark:bg-background-dark"
                />
              </div>
            </section>

            <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
              <section className="rounded-3xl border border-border-light bg-white p-5 shadow-soft dark:border-border-dark dark:bg-card-dark">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">4 · Choose support</p>
                <h2 className="mt-1 text-lg font-black text-text-primary dark:text-white">What would help next?</h2>
                <div className="mt-4 space-y-2">
                  {SUPPORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={supportNeed === option.value}
                      onClick={() => setSupportNeed(option.value)}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                        supportNeed === option.value
                          ? "border-primary bg-primary/10"
                          : "border-border-light hover:border-primary/35 dark:border-border-dark"
                      }`}
                    >
                      <span className={`material-symbols-outlined mt-0.5 text-xl ${supportNeed === option.value ? "text-primary" : "text-text-secondary"}`} aria-hidden="true">{option.icon}</span>
                      <span><span className="block text-sm font-bold text-text-primary dark:text-white">{option.label}</span><span className="mt-0.5 block text-xs leading-5 text-text-secondary">{option.description}</span></span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={save}
                  disabled={busy || !complete}
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-extrabold text-white shadow-primary-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">{todayCheckIn ? "sync" : "lock"}</span>
                  {busy ? "Saving…" : todayCheckIn ? "Update today's check-in" : "Save today's check-in"}
                </button>
                {!complete && <p className="mt-2 text-center text-xs text-text-secondary">Choose a feeling and all four ratings to save.</p>}
                {message && <p role="status" className="mt-3 rounded-xl bg-background-light p-3 text-sm font-semibold text-text-secondary dark:bg-background-dark">{message}</p>}
              </section>

              {support && (
                <section className={`rounded-3xl border p-5 ${support.tone === "support" ? "border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/25" : support.tone === "care" ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20" : "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20"}`}>
                  <h2 className="font-black text-text-primary dark:text-white">{support.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{support.message}</p>
                  {(supportNeed === "talk_to_someone" || supportNeed === "urgent_support" || support.tone === "support") && (
                    <div className="mt-4 grid gap-2">
                      <Link href="/chat" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white"><span className="material-symbols-outlined text-lg">chat_bubble</span>Talk privately now</Link>
                      <Link href="/counsellors" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-white px-4 text-sm font-bold text-primary dark:bg-card-dark"><span className="material-symbols-outlined text-lg">support_agent</span>Find a counsellor</Link>
                    </div>
                  )}
                  {supportNeed === "coping_tools" && <Link href="/chat" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary">Ask Sister for one small next step <span className="material-symbols-outlined text-lg">arrow_forward</span></Link>}
                  {supportNeed === "urgent_support" && <p className="mt-3 text-xs font-semibold leading-5 text-rose-800 dark:text-rose-200">If you may hurt yourself or someone else, or you are in immediate danger, contact local emergency help or a trusted person near you now.</p>}
                </section>
              )}
            </aside>
          </div>

          <section className="mt-8">
            <div className="flex items-end justify-between gap-4">
              <div><span className="eyebrow">Your private record</span><h2 className="mt-1 text-2xl font-black text-text-primary dark:text-white">Recent check-ins</h2></div>
              <Link href="/analytics" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary">See patterns <span className="material-symbols-outlined text-lg">arrow_forward</span></Link>
            </div>
            {history.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-border-light p-6 text-sm text-text-secondary dark:border-border-dark">Nothing recorded yet. One honest check-in is enough to begin.</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {history.slice(0, 6).map((entry) => (
                  <article key={entry.id} className="rounded-2xl border border-border-light bg-white p-4 dark:border-border-dark dark:bg-card-dark">
                    <div className="flex items-start justify-between gap-3">
                      <div><time className="text-xs font-bold text-text-secondary">{entry.localDate === today ? "Today" : entry.createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time><div className="mt-2 flex flex-wrap gap-1.5">{(entry.feelings || []).map((feeling) => { const details = feelingDetails(feeling); return <span key={feeling} className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-semibold text-text-primary dark:text-white">{details?.emoji} {details?.label || feeling}</span>; })}</div></div>
                      <span className="rounded-xl bg-background-light px-2.5 py-1 text-xs font-bold text-text-secondary dark:bg-background-dark">Mood {entry.mood}/5</span>
                    </div>
                    {(entry.contexts || []).length > 0 && <p className="mt-3 text-xs text-text-secondary">Around {(entry.contexts || []).map(contextLabel).join(", ")}</p>}
                    {entry.note && <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-primary dark:text-gray-200">{entry.note}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

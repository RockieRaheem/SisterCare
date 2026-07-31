"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { AppShellSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import { WellbeingCheckIn } from "@/types";

const AREAS = [
  { key: "mood", label: "Mood", low: "Very low", high: "Very good" },
  { key: "stress", label: "Stress", low: "Calm", high: "Overwhelming" },
  { key: "sleep", label: "Sleep", low: "Very poor", high: "Restful" },
  { key: "energy", label: "Energy", low: "Very low", high: "Very high" },
] as const;

type Scores = Record<(typeof AREAS)[number]["key"], number>;
const INITIAL: Scores = { mood: 3, stress: 3, sleep: 3, energy: 3 };

export default function WellbeingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [scores, setScores] = useState<Scores>(INITIAL);
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<WellbeingCheckIn[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;
    authenticatedFetch("/api/wellbeing")
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Could not load check-ins.");
        setHistory(
          (payload.data?.checkIns || []).map((entry: WellbeingCheckIn) => ({
            ...entry,
            createdAt: new Date(entry.createdAt),
          })),
        );
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Could not load check-ins."))
      .finally(() => setLoadingHistory(false));
  }, [user]);

  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await authenticatedFetch("/api/wellbeing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...scores, note }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save this check-in.");
      const checkIn = {
        ...payload.data.checkIn,
        createdAt: new Date(payload.data.checkIn.createdAt),
      } as WellbeingCheckIn;
      setHistory((current) => [checkIn, ...current].slice(0, 30));
      setNote("");
      setMessage("Your private check-in was saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this check-in.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || (user && loadingHistory)) return <AppShellSkeleton />;
  if (!user) return null;

  return (
    <>
      <Header variant="app" />
      <main id="main-content" className="min-h-screen pb-28 md:pb-10">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 md:py-10">
          <div className="max-w-2xl">
            <span className="eyebrow">Private check-in</span>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-text-primary dark:text-white">
              Notice how you are doing
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary dark:text-gray-400">
              This is a personal reflection, not a diagnosis or score. There are no streaks, rewards, or judgments.
            </p>
          </div>

          <section className="mt-7 rounded-3xl border border-border-light bg-white p-5 shadow-soft dark:border-border-dark dark:bg-card-dark sm:p-7">
            <div className="space-y-7">
              {AREAS.map((area) => (
                <fieldset key={area.key}>
                  <legend className="text-sm font-bold text-text-primary dark:text-white">{area.label}</legend>
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-label={`${area.label}: ${value} of 5`}
                        aria-pressed={scores[area.key] === value}
                        onClick={() => setScores((current) => ({ ...current, [area.key]: value }))}
                        className={`min-h-11 rounded-xl border text-sm font-bold transition ${
                          scores[area.key] === value
                            ? "border-primary bg-primary text-white"
                            : "border-border-light bg-background-light text-text-secondary hover:border-primary/50 dark:border-border-dark dark:bg-background-dark dark:text-gray-300"
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-text-secondary dark:text-gray-500">
                    <span>{area.low}</span>
                    <span>{area.high}</span>
                  </div>
                </fieldset>
              ))}
            </div>

            <label className="mt-7 block text-sm font-bold text-text-primary dark:text-white" htmlFor="wellbeing-note">
              Anything you want to remember? <span className="font-normal text-text-secondary">(optional)</span>
            </label>
            <textarea
              id="wellbeing-note"
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              placeholder="A short private note about today"
              className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-border-light bg-background-light px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-border-dark dark:bg-background-dark"
            />
            <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p role="status" className="text-sm text-text-secondary dark:text-gray-400">{message}</p>
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="min-h-12 rounded-xl bg-primary px-6 text-sm font-bold text-white transition hover:bg-primary-dark disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save check-in"}
              </button>
            </div>
          </section>

          <section className="mt-7">
            <h2 className="text-lg font-black text-text-primary dark:text-white">Recent check-ins</h2>
            {history.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-border-light p-6 text-sm text-text-secondary dark:border-border-dark dark:text-gray-400">
                Nothing recorded yet. Check in only when it feels useful.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {history.slice(0, 7).map((entry) => (
                  <article key={entry.id} className="rounded-2xl border border-border-light bg-white p-4 dark:border-border-dark dark:bg-card-dark">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <time className="text-xs font-semibold text-text-secondary dark:text-gray-400">
                        {entry.createdAt.toLocaleString()}
                      </time>
                      <span className="text-xs text-text-secondary dark:text-gray-400">
                        Mood {entry.mood}/5 · Stress {entry.stress}/5 · Sleep {entry.sleep}/5 · Energy {entry.energy}/5
                      </span>
                    </div>
                    {entry.note && <p className="mt-2 text-sm leading-6 text-text-primary dark:text-gray-200">{entry.note}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

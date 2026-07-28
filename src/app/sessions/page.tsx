"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { useAuth } from "@/context/AuthContext";
import { CounsellingSession } from "@/types";
import {
  listMySessions,
  requestSession,
  SESSION_STATE_META,
  SessionApiError,
} from "@/lib/sessionsClient";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function SessionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<CounsellingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSessions(await listMySessions());
      setError(null);
    } catch (err) {
      const status = (err as SessionApiError).status;
      setError(
        status === 503
          ? "Counselling sessions aren't enabled on this deployment yet."
          : "Couldn't load your sessions. Pull to retry.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }
    if (user) {
      load();
      const interval = setInterval(load, 15000);
      return () => clearInterval(interval);
    }
  }, [user, authLoading, router, load]);

  const handleRequest = async () => {
    setRequesting(true);
    try {
      const session = await requestSession();
      await load();
      if (session.state === "active") {
        router.push(`/sessions/${session.id}`);
      }
    } catch {
      setError("Couldn't request a session right now. Please try again.");
    } finally {
      setRequesting(false);
    }
  };

  const live = sessions.filter((s) =>
    ["requested", "matched", "accepted", "active"].includes(s.state),
  );
  const past = sessions.filter(
    (s) => !["requested", "matched", "accepted", "active"].includes(s.state),
  );

  return (
    <div className="app-page">
      <Header variant="app" />
      <main className="main-content mx-auto w-full max-w-3xl px-4 pt-7 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="eyebrow">Human care</span>
            <h1 className="page-title mt-1 text-3xl dark:text-white">
              My Sessions
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Private conversations with verified counsellors
            </p>
          </div>
          <button
            onClick={handleRequest}
            disabled={requesting || live.length > 0}
            className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {requesting ? "Requesting…" : "Talk to someone"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            {error}
          </div>
        )}

        {live.some((session) => session.emergencyFallbackRequired) && (
          <div className="mb-4 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100">
            <p className="font-semibold">Please do not wait if you are unsafe.</p>
            <p className="mt-1">
              Call Uganda Police on 999 or 112, call Sauti 116, or go to the
              nearest hospital while we continue trying to reach a counsellor.
            </p>
            <div className="mt-3 flex gap-2">
              <a className="rounded-lg bg-red-600 px-3 py-2 font-semibold text-white" href="tel:116">
                Call 116
              </a>
              <a className="rounded-lg border border-red-400 px-3 py-2 font-semibold" href="tel:112">
                Call 112
              </a>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-gray-400">
            Loading your sessions…
          </div>
        ) : sessions.length === 0 && !error ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-card-dark">
            <span className="material-symbols-outlined mb-3 text-5xl text-purple-300">
              forum
            </span>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">
              No sessions yet
            </h2>
            <p className="mx-auto mb-4 max-w-sm text-sm text-gray-500 dark:text-gray-400">
              When you need a real person to talk to, request a session and
              we&apos;ll match you with the best available counsellor.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {live.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Current
                </h2>
                <div className="space-y-3">
                  {live.map((s) => (
                    <SessionCard key={s.id} session={s} />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Past
                </h2>
                <div className="space-y-3">
                  {past.map((s) => (
                    <SessionCard key={s.id} session={s} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function SessionCard({ session }: { session: CounsellingSession }) {
  const meta = SESSION_STATE_META[session.state];
  const openable = ["active", "completed"].includes(session.state);

  const body = (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition dark:border-gray-700 dark:bg-card-dark">
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badgeClass}`}
          >
            {meta.label}
          </span>
          {session.priority === "critical" && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
              Priority
            </span>
          )}
        </div>
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {session.counsellorName
            ? `With ${session.counsellorName}`
            : "Counselling session"}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {meta.description} · {timeAgo(session.requestedAt)}
        </p>
      </div>
      {openable && (
        <span className="material-symbols-outlined shrink-0 self-center text-gray-400">
          chevron_right
        </span>
      )}
    </div>
  );

  return openable ? (
    <Link href={`/sessions/${session.id}`} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

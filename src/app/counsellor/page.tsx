"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { CounsellingSession } from "@/types";
import {
  listCounsellorSessions,
  transitionSession,
  sendPresence,
  SESSION_STATE_META,
  SessionApiError,
} from "@/lib/sessionsClient";

const HEARTBEAT_MS = 60_000;
const REFRESH_MS = 8_000;

type PresenceStatus = "available" | "busy" | "offline";

function timeAgo(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function CounsellorPortalPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [role, setRole] = useState<string | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);
  const [presence, setPresence] = useState<PresenceStatus>("offline");
  const [assigned, setAssigned] = useState<CounsellingSession[]>([]);
  const [openCritical, setOpenCritical] = useState<CounsellingSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presenceRef = useRef<PresenceStatus>("offline");
  presenceRef.current = presence;

  // Role gate: portal is for verified counsellors (admins may observe).
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }
    if (user) {
      auth.currentUser
        ?.getIdTokenResult()
        .then((result) => setRole((result.claims.role as string) || "user"))
        .catch(() => setRole("user"))
        .finally(() => setRoleChecked(true));
    }
  }, [user, authLoading, router]);

  const refresh = useCallback(async () => {
    try {
      const data = await listCounsellorSessions();
      setAssigned(data.assigned);
      setOpenCritical(data.openCritical);
      setError(null);
    } catch (err) {
      const status = (err as SessionApiError).status;
      if (status === 403) {
        setError("This portal requires a counsellor account.");
      } else if (status === 503) {
        setError("Sessions aren't enabled on this deployment yet.");
      } else {
        setError("Couldn't refresh sessions.");
      }
    }
  }, []);

  const isCounsellor = role === "counsellor" || role === "admin";

  useEffect(() => {
    if (!isCounsellor) return;
    refresh();
    const interval = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(interval);
  }, [isCounsellor, refresh]);

  // Presence heartbeat while available/busy; offline notice on leave.
  useEffect(() => {
    if (!isCounsellor) return;

    if (presence !== "offline") {
      sendPresence(presence).catch(() => setError("Presence update failed."));
      heartbeatRef.current = setInterval(() => {
        sendPresence(presenceRef.current).catch(() => {});
      }, HEARTBEAT_MS);
    }

    const goOffline = () => {
      if (presenceRef.current !== "offline") {
        // Best-effort on tab close; keepalive lets the request outlive the page.
        auth.currentUser?.getIdToken().then((token) => {
          fetch("/api/presence", {
            method: "POST",
            keepalive: true,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status: "offline" }),
          }).catch(() => {});
        });
      }
    };
    window.addEventListener("beforeunload", goOffline);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      window.removeEventListener("beforeunload", goOffline);
    };
  }, [presence, isCounsellor]);

  const setStatus = async (status: PresenceStatus) => {
    setPresence(status);
    try {
      await sendPresence(status);
      await refresh();
    } catch {
      setError("Presence update failed.");
    }
  };

  const act = async (
    sessionId: string,
    action: "accept" | "decline",
  ) => {
    setBusyAction(sessionId + action);
    try {
      await transitionSession(sessionId, action);
      await refresh();
      if (action === "accept") router.push(`/sessions/${sessionId}`);
    } catch {
      setError("Action failed — the session may have changed. Refreshing…");
      await refresh();
    } finally {
      setBusyAction(null);
    }
  };

  if (authLoading || !roleChecked) {
    return (
      <Shell>
        <div className="py-16 text-center text-gray-400">Loading portal…</div>
      </Shell>
    );
  }

  if (!isCounsellor) {
    return (
      <Shell>
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-card-dark">
          <span className="material-symbols-outlined mb-3 text-5xl text-purple-300">
            badge
          </span>
          <h1 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
            Counsellor access required
          </h1>
          <p className="mx-auto max-w-sm text-sm text-gray-500 dark:text-gray-400">
            This portal is for verified SisterCare counsellors. If you are a
            counsellor, ask the admin team to activate your account.
          </p>
        </div>
      </Shell>
    );
  }

  const incoming = assigned.filter((s) => s.state === "matched");
  const active = assigned.filter((s) => s.state === "active");
  const recent = assigned
    .filter((s) =>
      ["completed", "feedback_received", "escalated"].includes(s.state),
    )
    .slice(0, 10);

  return (
    <Shell>
      {/* Presence control */}
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-card-dark">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            Counsellor Portal
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {presence === "offline"
              ? "You're offline — go available to receive sessions"
              : presence === "available"
                ? "You're available — new sessions can be routed to you"
                : "You're busy — visible but not first in line"}
          </p>
        </div>
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          {(["available", "busy", "offline"] as PresenceStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                presence === s
                  ? s === "available"
                    ? "bg-green-600 text-white"
                    : s === "busy"
                      ? "bg-amber-500 text-white"
                      : "bg-gray-500 text-white"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          {error}
        </div>
      )}

      {/* Crisis queue */}
      {openCritical.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
            <span className="material-symbols-outlined text-base">
              emergency
            </span>
            Crisis queue — needs a human now
          </h2>
          <div className="space-y-3">
            {openCritical.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
              >
                <p className="mb-1 text-sm font-medium text-gray-900 dark:text-white">
                  {s.summary || "Crisis support needed"}
                </p>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                  Waiting {timeAgo(s.requestedAt)}
                  {s.preferredLanguage ? ` · ${s.preferredLanguage}` : ""}
                </p>
                <button
                  onClick={() => act(s.id, "accept")}
                  disabled={busyAction === s.id + "accept"}
                  className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {busyAction === s.id + "accept"
                    ? "Claiming…"
                    : "Claim this session"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Incoming requests */}
      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Incoming requests
        </h2>
        {incoming.length === 0 ? (
          <EmptyRow text="No pending requests. New matches appear here." />
        ) : (
          <div className="space-y-3">
            {incoming.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-card-dark"
              >
                <div className="mb-1 flex items-center gap-2">
                  {s.priority === "critical" && (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
                      Critical
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    Matched {s.matchedAt ? timeAgo(s.matchedAt) : "recently"}
                    {s.preferredLanguage ? ` · ${s.preferredLanguage}` : ""}
                    {s.specialty ? ` · ${s.specialty}` : ""}
                  </span>
                </div>
                <p className="mb-3 text-sm text-gray-900 dark:text-white">
                  {s.summary || "Counselling session request"}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => act(s.id, "accept")}
                    disabled={busyAction === s.id + "accept"}
                    className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => act(s.id, "decline")}
                    disabled={busyAction === s.id + "decline"}
                    className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Active sessions */}
      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Active sessions
        </h2>
        {active.length === 0 ? (
          <EmptyRow text="No active sessions." />
        ) : (
          <div className="space-y-3">
            {active.map((s) => (
              <Link
                key={s.id}
                href={`/sessions/${s.id}`}
                className="flex items-center justify-between rounded-2xl border border-green-200 bg-white p-4 transition hover:border-green-400 dark:border-green-800 dark:bg-card-dark"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {s.summary || "Counselling session"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Started {s.activeAt ? timeAgo(s.activeAt) : "recently"}
                  </p>
                </div>
                <span className="material-symbols-outlined text-gray-400">
                  chevron_right
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent history */}
      {recent.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Recent
          </h2>
          <div className="space-y-2">
            {recent.map((s) => {
              const meta = SESSION_STATE_META[s.state];
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-card-dark"
                >
                  <span className="truncate pr-3 text-sm text-gray-700 dark:text-gray-300">
                    {s.summary || "Session"}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {s.feedbackRating && (
                      <span className="text-xs text-amber-500">
                        ★ {s.feedbackRating}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.badgeClass}`}
                    >
                      {meta.label}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </Shell>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-400 dark:border-gray-700 dark:bg-card-dark">
      {text}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-page">
      <Header variant="app" />
      <main className="main-content mx-auto w-full max-w-3xl px-4 pt-7 sm:px-6">{children}</main>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CounsellorShell from "@/components/counsellor/CounsellorShell";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import {
  type CounsellorApplicationStatus,
  resolveCounsellorPortalState,
} from "@/lib/counsellorApplicationStatus";
import { getSupabaseBrowserClient } from "@/lib/supabase";
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

type PresenceStatus = "available" | "in_session" | "offline";
type ApplicationReview = {
  status: CounsellorApplicationStatus;
  submitted_at: string;
  reviewed_at: string | null;
  review_note: string | null;
};

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
  const [application, setApplication] = useState<ApplicationReview | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [presence, setPresence] = useState<PresenceStatus>("offline");
  const [assigned, setAssigned] = useState<CounsellingSession[]>([]);
  const [openCritical, setOpenCritical] = useState<CounsellingSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presenceRef = useRef<PresenceStatus>("offline");
  const presenceStartedRef = useRef(false);
  presenceRef.current = presence;

  const refreshAccess = useCallback(async () => {
    if (!user) return;
    try {
      const supabase = getSupabaseBrowserClient();
      const [profileResult, applicationResult] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", user.uid).maybeSingle(),
        supabase
          .from("counsellor_applications")
          .select("status, submitted_at, reviewed_at, review_note")
          .eq("counsellor_id", user.uid)
          .maybeSingle(),
      ]);
      if (profileResult.error) throw profileResult.error;
      if (applicationResult.error) throw applicationResult.error;
      setRole(profileResult.data?.role || "member");
      setApplication((applicationResult.data as ApplicationReview | null) || null);
      setAccessError(null);
    } catch {
      setAccessError("We could not verify your counsellor application status. Check your connection and try again.");
    } finally {
      setRoleChecked(true);
    }
  }, [user]);

  // Re-read both role and KYC state so an administrator's decision appears
  // without requiring the applicant to sign out or lose the status message.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login?next=/counsellor");
      return;
    }
    if (!user) return;
    void refreshAccess();
    const interval = setInterval(() => void refreshAccess(), 15_000);
    return () => clearInterval(interval);
  }, [user, authLoading, refreshAccess, router]);

  const refresh = useCallback(async () => {
    try {
      const data = await listCounsellorSessions();
      setAssigned(data.assigned);
      setOpenCritical(data.openCritical);
      const hasLiveAssignment = data.assigned.some((session) =>
        ["matched", "accepted", "active"].includes(session.state),
      );
      setPresence((current) =>
        hasLiveAssignment ? "in_session" : current === "in_session" ? "available" : current,
      );
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
  const portalState = resolveCounsellorPortalState(role, application?.status || null);

  useEffect(() => {
    if (!isCounsellor) return;
    refresh();
    const interval = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(interval);
  }, [isCounsellor, refresh]);

  // Opening the professional care desk establishes real server presence.
  // The UI only says "available" after the protected endpoint confirms it.
  useEffect(() => {
    if (!isCounsellor || presenceStartedRef.current) return;
    presenceStartedRef.current = true;
    sendPresence("available").then((effectiveStatus) => {
      setPresence(effectiveStatus);
      return refresh();
    }).catch(() => {
      setPresence("offline");
      setError("You are offline because your account is not currently eligible to receive sessions.");
    });
  }, [isCounsellor, refresh]);

  // Availability is user-controlled; in-session state is calculated by the server.
  useEffect(() => {
    if (!isCounsellor) return;

    if (presence === "available") {
      sendPresence("available").then(setPresence).catch(() => setError("Presence update failed."));
      heartbeatRef.current = setInterval(() => {
        if (presenceRef.current === "available") sendPresence("available").then(setPresence).catch(() => {});
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
    if (status === "in_session") return;
    try {
      const effectiveStatus = await sendPresence(status);
      setPresence(effectiveStatus);
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

  if (accessError && !role) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-soft dark:border-red-900 dark:bg-card-dark">
          <span className="material-symbols-outlined text-5xl text-red-500">cloud_off</span>
          <h1 className="mt-3 text-xl font-bold text-gray-900 dark:text-white">Application status unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{accessError}</p>
          <button onClick={() => void refreshAccess()} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">Try again</button>
        </div>
      </Shell>
    );
  }

  if (!isCounsellor) {
    return (
      <Shell>
        <ApplicationStatePanel
          state={portalState}
          application={application}
          onRefresh={() => void refreshAccess()}
        />
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
      {application?.status === "verified" && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200">
          <span className="material-symbols-outlined mt-0.5">verified</span>
          <div>
            <p className="font-bold">Your counsellor application is approved</p>
            <p className="mt-1 text-sm leading-6">Your verified professional workspace is active. Set your availability below when you are ready to receive care requests.</p>
          </div>
        </div>
      )}
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
                : "You're in session — availability resumes when the session ends"}
          </p>
        </div>
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          {(["available", "offline"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                presence === s
                  ? s === "available"
                    ? "bg-green-600 text-white"
                    : "bg-gray-500 text-white"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              {s}
            </button>
          ))}
          {presence === "in_session" && (
            <span className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">In session</span>
          )}
        </div>
      </div>

      <Link href="/counsellor/articles" className="mb-6 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-4 transition hover:bg-primary/10">
        <span>
          <span className="block text-sm font-bold text-text-primary dark:text-white">Professional library contributions</span>
          <span className="mt-1 block text-xs text-text-secondary">Write an article and submit it for clinical editorial review.</span>
        </span>
        <span className="material-symbols-outlined text-primary">edit_note</span>
      </Link>

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

function ApplicationStatePanel({
  state,
  application,
  onRefresh,
}: {
  state: ReturnType<typeof resolveCounsellorPortalState>;
  application: ApplicationReview | null;
  onRefresh: () => void;
}) {
  if (state === "pending") {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-soft dark:border-amber-900 dark:bg-card-dark">
        <span className="material-symbols-outlined text-5xl text-amber-500">hourglass_top</span>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">KYC review in progress</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Your application is awaiting administrator approval</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-300">Your documents were submitted securely. Your professional workspace will remain locked while an authorised administrator verifies your identity and credentials.</p>
        {application?.submitted_at && <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Submitted {new Date(application.submitted_at).toLocaleString()}</p>}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={onRefresh} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">Check review status</button>
          <Link href="/counsellor/apply" className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">View submitted application</Link>
        </div>
      </div>
    );
  }

  if (state === "verified") {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-green-200 bg-white p-8 text-center shadow-soft dark:border-green-900 dark:bg-card-dark">
        <span className="material-symbols-outlined text-5xl text-green-600">verified</span>
        <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Your counsellor application was approved</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-300">Verification succeeded. SisterCare is activating your professional workspace now.</p>
        <button onClick={onRefresh} className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">Open counsellor workspace</button>
      </div>
    );
  }

  if (state === "rejected") {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-soft dark:border-red-900 dark:bg-card-dark">
        <span className="material-symbols-outlined text-5xl text-red-500">cancel</span>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-red-700 dark:text-red-300">Application not approved</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Your counsellor verification was unsuccessful</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-300">{application?.review_note || "The administrator could not verify the submitted credentials. Contact SisterCare support before submitting new documents."}</p>
        {application?.reviewed_at && <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Reviewed {new Date(application.reviewed_at).toLocaleString()}</p>}
        <Link href="/help" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">Contact SisterCare support</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-soft dark:border-gray-700 dark:bg-card-dark">
      <span className="material-symbols-outlined text-5xl text-primary">badge</span>
      <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Complete your counsellor application</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-300">Submit your professional profile and private KYC documents. Counsellor access is granted only after administrator verification.</p>
      <Link href="/counsellor/apply" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">Apply to join the care network</Link>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <CounsellorShell>{children}</CounsellorShell>;
}

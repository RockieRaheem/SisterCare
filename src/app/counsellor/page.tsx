"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CounsellorShell from "@/components/counsellor/CounsellorShell";
import {
  OperationsEmptyState,
  OperationsNotice,
  OperationsPageHeader,
  OperationsSkeleton,
  OperationsStat,
  OperationsSyncStatus,
  StatusBadge,
} from "@/components/operations/OperationsUI";
import { useAuth } from "@/context/AuthContext";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import {
  type CounsellorApplicationStatus,
  resolveCounsellorPortalState,
} from "@/lib/counsellorApplicationStatus";
import { readApiResponse } from "@/lib/apiResponse";
import {
  shouldMaintainPresence,
  shouldWithdrawAvailability,
} from "@/lib/presencePolicy";
import { type CounsellingSession } from "@/types";
import {
  listCounsellorSessions,
  transitionSession,
  sendPresence,
  SESSION_STATE_META,
  type SessionApiError,
} from "@/lib/sessionsClient";

const HEARTBEAT_MS = 60_000;
const REFRESH_MS = 8_000;

type PresenceStatus = "available" | "in_session" | "offline";
type ApplicationReview = {
  status: CounsellorApplicationStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
};

function timeAgo(date?: Date): string {
  if (!date || Number.isNaN(date.getTime())) return "recently";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function isToday(value?: Date) {
  if (!value) return false;
  const today = new Date();
  return (
    value.getFullYear() === today.getFullYear() &&
    value.getMonth() === today.getMonth() &&
    value.getDate() === today.getDate()
  );
}

function PresenceControl({
  presence,
  busy,
  onChange,
}: {
  presence: PresenceStatus;
  busy: boolean;
  onChange: (status: "available" | "offline") => void;
}) {
  const meta = {
    available: {
      label: "Available for matching",
      description: "Your live signal is active and new sessions can be routed to you.",
      icon: "radio_button_checked",
      tone: "success" as const,
    },
    in_session: {
      label: "Currently in session",
      description: "You remain on duty, but matching follows your configured capacity.",
      icon: "forum",
      tone: "warning" as const,
    },
    offline: {
      label: "Not receiving requests",
      description: "Go available when you are ready and able to provide confidential care.",
      icon: "do_not_disturb_on",
      tone: "neutral" as const,
    },
  }[presence];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1b1922]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              presence === "available"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : presence === "in_session"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            <span className="material-symbols-outlined" aria-hidden="true">{meta.icon}</span>
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-extrabold text-slate-950 dark:text-white">Shift availability</h2>
              <StatusBadge tone={meta.tone} dot>{meta.label}</StatusBadge>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {meta.description}
            </p>
          </div>
        </div>
        <div
          className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
          aria-label="Availability"
        >
          <button
            type="button"
            onClick={() => onChange("available")}
            disabled={busy || presence === "in_session"}
            aria-pressed={presence === "available"}
            className={`min-h-10 rounded-lg px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              presence === "available"
                ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            } disabled:cursor-not-allowed disabled:opacity-55`}
          >
            Available
          </button>
          <button
            type="button"
            onClick={() => onChange("offline")}
            disabled={busy || presence === "in_session"}
            aria-pressed={presence === "offline"}
            className={`min-h-10 rounded-lg px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              presence === "offline"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            } disabled:cursor-not-allowed disabled:opacity-55`}
          >
            Offline
          </button>
        </div>
      </div>
    </section>
  );
}

function SessionContext({ session }: { session: CounsellingSession }) {
  const contextLabel =
    session.contextScope === "member_approved"
      ? "Member-approved summary"
      : session.contextScope === "safety_minimum"
        ? "Minimum safety context"
        : "No chat context shared";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
      <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
        <span className="material-symbols-outlined text-sm" aria-hidden="true">person</span>
        {session.participantAlias || "SisterCare member"}
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="material-symbols-outlined text-sm" aria-hidden="true">shield_lock</span>
        {contextLabel}
      </span>
      {session.preferredLanguage && (
        <span className="inline-flex items-center gap-1">
          <span className="material-symbols-outlined text-sm" aria-hidden="true">language</span>
          {session.preferredLanguage}
        </span>
      )}
      {session.specialty && (
        <span className="inline-flex items-center gap-1">
          <span className="material-symbols-outlined text-sm" aria-hidden="true">clinical_notes</span>
          {session.specialty}
        </span>
      )}
      <span>Requested {timeAgo(session.requestedAt)}</span>
    </div>
  );
}

export default function CounsellorPortalPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
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
  const [presenceBusy, setPresenceBusy] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshInFlightRef = useRef(false);
  const presenceRef = useRef<PresenceStatus>("offline");
  const presenceInitializedRef = useRef(false);
  presenceRef.current = presence;

  const refreshAccess = useCallback(async () => {
    if (!user) return;
    try {
      const response = await authenticatedFetch(
        "/api/counsellor/application",
      );
      const result = await readApiResponse<{
        success: boolean;
        error?: string;
        data?: {
          account: { role: string; workspaceAccess: boolean };
          application: ApplicationReview | null;
        };
      }>(response);
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || "Could not verify counsellor access");
      }
      setRole(result.data.account.role);
      setApplication(result.data.application);
      setAccessError(null);
    } catch {
      setAccessError("We could not verify your counsellor application status. Check your connection and try again.");
    } finally {
      setRoleChecked(true);
    }
  }, [user]);

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
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    setRefreshing(true);
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
      setLastSyncedAt(new Date());
      setError(null);
    } catch (refreshError) {
      const status = (refreshError as SessionApiError).status;
      if (status === 403) setError("This care desk requires a verified counsellor account.");
      else if (status === 401) setError("Your secure session expired. Sign in again to continue.");
      else if (status === 503) setError("Live care is temporarily unavailable. Your availability may not be current.");
      else setError("We could not refresh the care desk. Check your connection and try again.");
    } finally {
      setSessionsLoading(false);
      setRefreshing(false);
      refreshInFlightRef.current = false;
    }
  }, []);

  const isCounsellor = role === "counsellor" || role === "admin";
  const portalState = resolveCounsellorPortalState(role, application?.status || null);

  useEffect(() => {
    if (!isCounsellor) return;
    void refresh();
    const refreshVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const reconnect = () => {
      setOnline(true);
      void refresh();
    };
    const disconnect = () => {
      setOnline(false);
      if (presenceRef.current === "available") setPresence("offline");
    };
    const interval = window.setInterval(refreshVisible, REFRESH_MS);
    const clockInterval = window.setInterval(() => setClock(Date.now()), 15_000);
    window.addEventListener("focus", refreshVisible);
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", disconnect);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.clearInterval(interval);
      window.clearInterval(clockInterval);
      window.removeEventListener("focus", refreshVisible);
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", disconnect);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [isCounsellor, refresh]);

  useEffect(() => {
    if (!isCounsellor || presenceInitializedRef.current) return;
    presenceInitializedRef.current = true;
    setPresenceBusy(true);
    listCounsellorSessions()
      .then(async (data) => {
        const hasLiveAssignment = data.assigned.some((session) =>
          ["matched", "accepted", "active"].includes(session.state),
        );
        const effectiveStatus = await sendPresence(
          hasLiveAssignment ? "available" : "offline",
        );
        setPresence(effectiveStatus);
        setAssigned(data.assigned);
        setOpenCritical(data.openCritical);
        setLastSyncedAt(new Date());
      })
      .catch(() => {
        setPresence("offline");
        setError("Your care desk started offline. Choose Available only when you are ready to receive a member.");
      })
      .finally(() => setPresenceBusy(false));
  }, [isCounsellor]);

  useEffect(() => {
    if (!isCounsellor) return;
    if (presence !== "offline") {
      heartbeatRef.current = setInterval(() => {
        if (shouldMaintainPresence(
          presenceRef.current,
          document.visibilityState === "visible",
          navigator.onLine,
        )) {
          void sendPresence("available").then(setPresence).catch(() => {
            if (presenceRef.current === "available") setPresence("offline");
            setError("Your live availability signal was interrupted. Reconnect before accepting new care.");
          });
        }
      }, HEARTBEAT_MS);
    }
    const handleVisibility = () => {
      if (shouldWithdrawAvailability(
        presenceRef.current,
        document.visibilityState === "visible",
      )) {
        setPresence("offline");
        void sendPresence("offline").catch(() => undefined);
      }
    };
    const goOffline = () => {
      if (presenceRef.current !== "offline") {
        void authenticatedFetch("/api/presence", {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "offline" }),
        });
      }
    };
    window.addEventListener("beforeunload", goOffline);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      window.removeEventListener("beforeunload", goOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [presence, isCounsellor]);

  const setStatus = async (status: "available" | "offline") => {
    setPresenceBusy(true);
    setError(null);
    try {
      const effectiveStatus = await sendPresence(status);
      setPresence(effectiveStatus);
      await refresh();
    } catch (presenceError) {
      setError(presenceError instanceof Error ? presenceError.message : "Presence update failed.");
    } finally {
      setPresenceBusy(false);
    }
  };

  const act = async (sessionId: string, action: "accept" | "decline") => {
    setBusyAction(sessionId + action);
    setError(null);
    try {
      await transitionSession(sessionId, action);
      await refresh();
      if (action === "accept") router.push(`/sessions/${sessionId}`);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "This request changed before the action completed.",
      );
      await refresh();
    } finally {
      setBusyAction(null);
    }
  };

  const incoming = useMemo(() => assigned.filter((session) => session.state === "matched"), [assigned]);
  const currentCare = useMemo(
    () => assigned.filter((session) => ["accepted", "active"].includes(session.state)),
    [assigned],
  );
  const recent = useMemo(
    () =>
      assigned
        .filter((session) => ["completed", "feedback_received", "escalated"].includes(session.state))
        .sort(
          (a, b) =>
            (b.completedAt?.getTime() || b.requestedAt.getTime()) -
            (a.completedAt?.getTime() || a.requestedAt.getTime()),
        )
        .slice(0, 10),
    [assigned],
  );
  const completedToday = recent.filter(
    (session) => ["completed", "feedback_received"].includes(session.state) && isToday(session.completedAt),
  ).length;
  const feedback = recent
    .map((session) => session.feedbackRating)
    .filter((rating): rating is number => typeof rating === "number");
  const averageRating = feedback.length
    ? (feedback.reduce((total, rating) => total + rating, 0) / feedback.length).toFixed(1)
    : "—";
  const dataIsStale = Boolean(
    lastSyncedAt && clock - lastSyncedAt.getTime() > REFRESH_MS * 3,
  );
  const firstName =
    userProfile?.displayName?.trim().split(/\s+/)[0] ||
    user?.displayName?.trim().split(/\s+/)[0] ||
    "Counsellor";

  if (authLoading || !roleChecked) {
    return (
      <CounsellorShell>
        <OperationsPageHeader
          eyebrow="Professional care"
          title="Preparing your care desk"
          description="Verifying your role and securely loading live care information."
        />
        <OperationsSkeleton rows={4} />
      </CounsellorShell>
    );
  }

  if (accessError && !role) {
    return (
      <CounsellorShell>
        <OperationsNotice
          tone="danger"
          title="Application status unavailable"
          action={
            <button type="button" onClick={() => void refreshAccess()} className="min-h-10 rounded-xl bg-red-700 px-4 text-xs font-bold text-white">
              Try again
            </button>
          }
        >
          {accessError}
        </OperationsNotice>
      </CounsellorShell>
    );
  }

  if (!isCounsellor) {
    return (
      <CounsellorShell>
        <ApplicationStatePanel state={portalState} application={application} onRefresh={() => void refreshAccess()} />
      </CounsellorShell>
    );
  }

  return (
    <CounsellorShell>
      <OperationsPageHeader
        eyebrow="Professional care"
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${firstName}`}
        description="Manage your live availability, respond to assigned care and continue active conversations from one focused workspace."
        actions={
          <>
            <OperationsSyncStatus
              updatedAt={lastSyncedAt}
              refreshing={refreshing}
              hasError={Boolean(error)}
              stale={dataIsStale}
              online={online}
            />
            <Link href="/counsellor/profile" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-primary/30 hover:text-primary dark:border-slate-700 dark:bg-[#1b1922] dark:text-slate-200">
              <span className="material-symbols-outlined text-xl" aria-hidden="true">badge</span>
              Edit profile
            </Link>
            <Link href="/counsellor/articles" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-primary/30 hover:text-primary dark:border-slate-700 dark:bg-[#1b1922] dark:text-slate-200">
              <span className="material-symbols-outlined text-xl" aria-hidden="true">edit_note</span>
              Write article
            </Link>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950"
            >
              <span className={`material-symbols-outlined text-xl ${refreshing ? "animate-spin" : ""}`} aria-hidden="true">refresh</span>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </>
        }
      />

      {application?.status === "verified" && (
        <div className="mb-5">
          <OperationsNotice tone="success" title="Verified professional workspace">
            Your credentials are approved. Availability and session activity remain securely recorded.
          </OperationsNotice>
        </div>
      )}

      {error && (
        <div className="mb-5">
          <OperationsNotice
            tone="warning"
            title="Live care needs attention"
            action={
              <button type="button" onClick={() => void refresh()} className="min-h-9 rounded-lg border border-current px-3 text-xs font-bold">
                Retry
              </button>
            }
          >
            {error}
          </OperationsNotice>
        </div>
      )}

      <PresenceControl presence={presence} busy={presenceBusy} onChange={(status) => void setStatus(status)} />

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Care desk summary">
        <OperationsStat
          label="Awaiting response"
          value={incoming.length + openCritical.length}
          icon="notifications_active"
          tone={openCritical.length ? "danger" : incoming.length ? "warning" : "neutral"}
          helper={openCritical.length ? `${openCritical.length} crisis request${openCritical.length === 1 ? "" : "s"} need immediate review` : "Matched and crisis requests"}
        />
        <OperationsStat
          label="Current care"
          value={currentCare.length}
          icon="forum"
          tone={currentCare.length ? "success" : "neutral"}
          helper="Accepted or active sessions"
        />
        <OperationsStat
          label="Completed today"
          value={completedToday}
          icon="task_alt"
          tone="primary"
          helper="Sessions closed today"
        />
        <OperationsStat
          label="Recent rating"
          value={averageRating}
          icon="star"
          tone="warning"
          helper={feedback.length ? `Across ${feedback.length} recent rating${feedback.length === 1 ? "" : "s"}` : "No recent member ratings"}
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <div className="space-y-6">
          {openCritical.length > 0 && (
            <section aria-labelledby="crisis-queue-heading">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" aria-hidden="true" />
                    <h2 id="crisis-queue-heading" className="font-extrabold text-red-700 dark:text-red-300">Crisis queue</h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Review immediately and claim only when you can provide focused care.</p>
                </div>
                <StatusBadge tone="danger">{openCritical.length} waiting</StatusBadge>
              </div>
              <div className="space-y-3">
                {openCritical.map((session) => (
                  <article key={session.id} className="rounded-2xl border border-red-300 bg-red-50/70 p-5 dark:border-red-900 dark:bg-red-950/25">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <StatusBadge tone="danger">Critical support</StatusBadge>
                        <p className="mt-3 text-sm font-bold leading-6 text-slate-950 dark:text-white">
                          {session.summary || "Immediate human support requested"}
                        </p>
                        <div className="mt-2"><SessionContext session={session} /></div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void act(session.id, "accept")}
                        disabled={busyAction === session.id + "accept"}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-bold text-white transition hover:bg-red-800 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-xl" aria-hidden="true">front_hand</span>
                        {busyAction === session.id + "accept" ? "Claiming…" : "Claim now"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="incoming-heading">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 id="incoming-heading" className="font-extrabold text-slate-950 dark:text-white">Assigned requests</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Respond promptly so members are not left waiting.</p>
              </div>
              <StatusBadge tone={incoming.length ? "info" : "neutral"}>{incoming.length}</StatusBadge>
            </div>
            {sessionsLoading ? (
              <OperationsSkeleton rows={2} />
            ) : incoming.length === 0 ? (
              <OperationsEmptyState
                icon="inbox"
                title="No assigned requests"
                description={presence === "available" ? "You are live. New matched requests will appear here automatically." : "Go available when you are ready to receive new care requests."}
              />
            ) : (
              <div className="space-y-3">
                {incoming.map((session) => (
                  <article key={session.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1b1922]">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={session.priority === "critical" ? "danger" : "info"}>
                        {session.priority === "critical" ? "Critical" : "Standard"}
                      </StatusBadge>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Matched {timeAgo(session.matchedAt)}</span>
                    </div>
                    <p className="mt-3 text-sm font-bold leading-6 text-slate-950 dark:text-white">
                      {session.summary || "Member requested a counselling session"}
                    </p>
                    <div className="mt-2"><SessionContext session={session} /></div>
                    <div className="mt-4 flex flex-col gap-2 xs:flex-row">
                      <button
                        type="button"
                        onClick={() => void act(session.id, "accept")}
                        disabled={busyAction !== null}
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary-dark disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-xl" aria-hidden="true">check</span>
                        {busyAction === session.id + "accept" ? "Accepting…" : "Accept and open"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void act(session.id, "decline")}
                        disabled={busyAction !== null}
                        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        {busyAction === session.id + "decline" ? "Releasing…" : "Cannot take this"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="current-heading">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 id="current-heading" className="font-extrabold text-slate-950 dark:text-white">Current care</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Continue accepted and live sessions.</p>
              </div>
              <StatusBadge tone={currentCare.length ? "success" : "neutral"}>{currentCare.length}</StatusBadge>
            </div>
            {currentCare.length === 0 ? (
              <OperationsEmptyState icon="forum" title="No live conversations" description="Accepted sessions remain visible here until they are completed or escalated." />
            ) : (
              <div className="space-y-3">
                {currentCare.map((session) => (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="group flex items-center gap-4 rounded-2xl border border-emerald-200 bg-white p-5 transition hover:border-emerald-400 hover:shadow-soft dark:border-emerald-900 dark:bg-[#1b1922]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <span className="material-symbols-outlined" aria-hidden="true">forum</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-950 dark:text-white">{session.summary || "Counselling session"}</span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                        {session.state === "accepted" ? "Ready to begin" : `Active ${timeAgo(session.activeAt)}`}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      Open
                      <span className="material-symbols-outlined transition group-hover:translate-x-0.5" aria-hidden="true">arrow_forward</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1b1922]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-extrabold text-slate-950 dark:text-white">Care readiness</h2>
              <StatusBadge tone={presence === "available" ? "success" : "neutral"} dot>
                {presence === "available" ? "Live" : presence === "in_session" ? "In care" : "Offline"}
              </StatusBadge>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined mt-0.5 text-lg text-emerald-600" aria-hidden="true">verified_user</span>
                <span>Use only this secure workspace for member care.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined mt-0.5 text-lg text-amber-600" aria-hidden="true">schedule</span>
                <span>Respond to assigned requests as soon as they appear.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined mt-0.5 text-lg text-red-600" aria-hidden="true">emergency</span>
                <span>Escalate immediate danger through the session controls.</span>
              </li>
            </ul>
            <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              {lastSyncedAt ? `Last synchronized ${timeAgo(lastSyncedAt)}` : "Waiting for the first secure synchronization"}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1b1922]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-extrabold text-slate-950 dark:text-white">Recent outcomes</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Latest completed or escalated sessions</p>
              </div>
              <span className="material-symbols-outlined text-slate-400" aria-hidden="true">history</span>
            </div>
            {recent.length ? (
              <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                {recent.slice(0, 6).map((session) => {
                  const meta = SESSION_STATE_META[session.state];
                  return (
                    <div key={session.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-800 dark:text-slate-200">{session.summary || "Counselling session"}</p>
                        {session.feedbackRating && <span className="shrink-0 text-xs font-bold text-amber-600">★ {session.feedbackRating}</span>}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.badgeClass}`}>{meta.label}</span>
                        <span className="text-[11px] text-slate-400">{timeAgo(session.completedAt || session.requestedAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">No recent outcomes yet.</p>
            )}
          </section>

          <Link href="/counsellor/support" className="group flex items-center gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 transition hover:bg-primary/10">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm dark:bg-slate-900">
              <span className="material-symbols-outlined" aria-hidden="true">contact_support</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-950 dark:text-white">Need operations support?</span>
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Get help with access, KYC or session routing.</span>
            </span>
            <span className="material-symbols-outlined text-primary transition group-hover:translate-x-0.5" aria-hidden="true">arrow_forward</span>
          </Link>
        </aside>
      </div>
    </CounsellorShell>
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
  const commonHeader = (
    <OperationsPageHeader
      eyebrow="Professional verification"
      title="Counsellor access"
      description="Professional workspaces open only after identity and credential verification."
    />
  );

  if (state === "pending") {
    return (
      <>
        {commonHeader}
        <div className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-white p-7 text-center shadow-soft dark:border-amber-900 dark:bg-[#1b1922] sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <span className="material-symbols-outlined text-3xl" aria-hidden="true">hourglass_top</span>
          </span>
          <StatusBadge tone="warning">Review in progress</StatusBadge>
          <h2 className="mt-4 text-xl font-extrabold text-slate-950 dark:text-white">Your application is awaiting approval</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">Operations is verifying your professional identity and credentials. You cannot receive member sessions until approval is complete.</p>
          {application?.submittedAt && <p className="mt-4 text-xs text-slate-500">Submitted {new Date(application.submittedAt).toLocaleString()}</p>}
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={onRefresh} className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-white">Check status</button>
            <Link href="/counsellor/apply" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">View application</Link>
          </div>
        </div>
      </>
    );
  }

  if (state === "verified") {
    return (
      <>
        {commonHeader}
        <OperationsNotice
          tone="success"
          title="Your counsellor application was approved"
          action={<button type="button" onClick={onRefresh} className="min-h-10 rounded-xl bg-emerald-700 px-4 text-xs font-bold text-white">Open care desk</button>}
        >
          Verification succeeded. SisterCare is activating your professional workspace.
        </OperationsNotice>
      </>
    );
  }

  if (state === "rejected") {
    return (
      <>
        {commonHeader}
        <div className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-white p-7 text-center shadow-soft dark:border-red-900 dark:bg-[#1b1922] sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <span className="material-symbols-outlined text-3xl" aria-hidden="true">cancel</span>
          </span>
          <StatusBadge tone="danger">Changes required</StatusBadge>
          <h2 className="mt-4 text-xl font-extrabold text-slate-950 dark:text-white">Your application was not approved</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{application?.reviewNote || "The submitted credentials could not be verified. Correct the application and submit it for another review."}</p>
          {application?.reviewedAt && <p className="mt-4 text-xs text-slate-500">Reviewed {new Date(application.reviewedAt).toLocaleString()}</p>}
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/counsellor/apply?mode=revise" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-white">Edit and resubmit</Link>
            <Link href="/counsellor/apply?mode=fresh" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Start afresh</Link>
          </div>
          <Link href="/counsellor/support" className="mt-4 inline-flex text-sm font-bold text-primary hover:underline">Contact operations</Link>
        </div>
      </>
    );
  }

  return (
    <>
      {commonHeader}
      <OperationsEmptyState
        icon="badge"
        title="Complete your counsellor application"
        description="Submit your professional profile and private KYC documents. Access is granted only after administrator verification."
        href="/counsellor/apply"
        actionLabel="Start professional application"
      />
    </>
  );
}

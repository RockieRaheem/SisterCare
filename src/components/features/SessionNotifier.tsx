"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getSessionDeclineNotice,
  isSessionReadyForMember,
  listMySessions,
} from "@/lib/sessionsClient";
import {
  showBrowserNotification,
  storeNotification,
} from "@/lib/notifications";

const notifiedKey = (uid: string) => `sistercare_ready_sessions_${uid}`;

function readNotified(uid: string): Set<string> {
  try {
    const stored = localStorage.getItem(notifiedKey(uid));
    return new Set(stored ? (JSON.parse(stored) as string[]) : []);
  } catch {
    return new Set();
  }
}

export default function SessionNotifier() {
  const { user, userProfile } = useAuth();
  const [sessionUpdate, setSessionUpdate] = useState<{
    id: string;
    kind: "ready" | "declined";
    counsellorName?: string;
    message: string;
  } | null>(null);
  const checkingRef = useRef(false);
  const isMember =
    userProfile?.role !== "admin" &&
    userProfile?.role !== "counsellor" &&
    userProfile?.registrationIntent !== "counsellor";

  const check = useCallback(async () => {
    if (!user?.uid || !isMember || checkingRef.current) return;
    checkingRef.current = true;
    try {
      const sessions = await listMySessions();
      const notified = readNotified(user.uid);
      const newlyReady = sessions.find(
        (session) =>
          isSessionReadyForMember(session) &&
          !notified.has(session.id),
      );
      const newlyDeclined = newlyReady
        ? null
        : sessions
            .map((session) => ({
              session,
              notice: getSessionDeclineNotice(session),
            }))
            .find(({ notice }) => notice && !notified.has(notice.key));
      const notificationKey =
        newlyReady?.id || newlyDeclined?.notice?.key;
      if (!notificationKey) return;
      notified.add(notificationKey);
      localStorage.setItem(notifiedKey(user.uid), JSON.stringify([...notified]));
      const targetSession = newlyReady || newlyDeclined?.session;
      if (!targetSession) return;
      const href = `/sessions/${targetSession.id}`;
      const title = newlyReady
        ? "Your counsellor is ready"
        : newlyDeclined?.notice?.title || "Counsellor request update";
      const message = newlyReady
        ? newlyReady.counsellorName
          ? `${newlyReady.counsellorName} accepted your request. Open your private room to talk.`
          : "Your counsellor accepted your request. Open your private room to talk."
        : newlyDeclined?.notice?.message ||
          "SisterCare is finding another available counsellor.";
      const notificationId = newlyReady
        ? `session-ready-${targetSession.id}`
        : `session-declined-${notificationKey}`;
      storeNotification(
        {
          id: notificationId,
          type: newlyReady ? "counsellor_ready" : "counsellor_update",
          title,
          message,
          href,
          timestamp: new Date(),
          read: false,
        },
        user.uid,
      );
      showBrowserNotification(title, {
        body: message,
        tag: notificationId,
        data: { href },
      });
      setSessionUpdate({
        id: targetSession.id,
        kind: newlyReady ? "ready" : "declined",
        counsellorName: newlyReady?.counsellorName,
        message,
      });
    } catch {
      // Page-level session screens retain their own visible retry state.
    } finally {
      checkingRef.current = false;
    }
  }, [isMember, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !isMember) return;
    void check();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, 5_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check, isMember, user?.uid]);

  if (!sessionUpdate) return null;

  return (
    <aside
      role="status"
      className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4.5rem)] z-[90] mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-fuchsia-200 bg-white p-3 shadow-2xl dark:border-fuchsia-800 dark:bg-card-dark"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-dark">
        <span className="material-symbols-outlined">support_agent</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-text-primary dark:text-white">
          {sessionUpdate.kind === "ready"
            ? "Your counsellor is ready"
            : "Counsellor request update"}
        </p>
        <p className="line-clamp-2 text-xs text-text-secondary">
          {sessionUpdate.kind === "ready" && sessionUpdate.counsellorName
            ? `${sessionUpdate.counsellorName} accepted your request.`
            : sessionUpdate.message}
        </p>
      </div>
      <Link
        href={`/sessions/${sessionUpdate.id}`}
        onClick={() => setSessionUpdate(null)}
        className="inline-flex min-h-10 shrink-0 items-center rounded-xl bg-primary-dark px-3 text-xs font-bold text-white"
      >
        {sessionUpdate.kind === "ready" ? "Open room" : "View update"}
      </Link>
      <button
        type="button"
        onClick={() => setSessionUpdate(null)}
        aria-label="Dismiss"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </aside>
  );
}

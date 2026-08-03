"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { listMySessions } from "@/lib/sessionsClient";
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
  const [readySession, setReadySession] = useState<{
    id: string;
    counsellorName?: string;
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
        (session) => session.state === "active" && !notified.has(session.id),
      );
      if (!newlyReady) return;
      notified.add(newlyReady.id);
      localStorage.setItem(notifiedKey(user.uid), JSON.stringify([...notified]));
      const href = `/sessions/${newlyReady.id}`;
      const title = "Your counsellor is ready";
      const message = newlyReady.counsellorName
        ? `${newlyReady.counsellorName} accepted your request. Open your private room to talk.`
        : "Your counsellor accepted your request. Open your private room to talk.";
      storeNotification(
        {
          id: `session-ready-${newlyReady.id}`,
          type: "counsellor_ready",
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
        tag: `session-ready-${newlyReady.id}`,
        data: { href },
      });
      setReadySession({
        id: newlyReady.id,
        counsellorName: newlyReady.counsellorName,
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

  if (!readySession) return null;

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
          Your counsellor is ready
        </p>
        <p className="truncate text-xs text-text-secondary">
          {readySession.counsellorName
            ? `${readySession.counsellorName} accepted your request.`
            : "Your private room is now open."}
        </p>
      </div>
      <Link
        href={`/sessions/${readySession.id}`}
        onClick={() => setReadySession(null)}
        className="inline-flex min-h-10 shrink-0 items-center rounded-xl bg-primary-dark px-3 text-xs font-bold text-white"
      >
        Open room
      </Link>
      <button
        type="button"
        onClick={() => setReadySession(null)}
        aria-label="Dismiss"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </aside>
  );
}

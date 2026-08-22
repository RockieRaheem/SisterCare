"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getSessionDeclineNotice,
  isSessionReadyForMember,
  listCounsellorSessions,
  listMySessions,
} from "@/lib/sessionsClient";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { messageFromRealtimeRow } from "@/lib/sessionMessaging";
import {
  CareNotificationType,
  describeCareNotification,
} from "@/lib/careNotification";
import {
  showBrowserNotification,
  storeNotification,
} from "@/lib/notifications";

const notifiedKey = (uid: string) => `sistercare_ready_sessions_${uid}`;
const notifiedMessageKey = (uid: string) =>
  `sistercare_session_messages_${uid}`;

function readNotified(uid: string): Set<string> {
  try {
    const stored = localStorage.getItem(notifiedKey(uid));
    return new Set(stored ? (JSON.parse(stored) as string[]) : []);
  } catch {
    return new Set();
  }
}

function readNotifiedMessages(uid: string): Set<string> {
  try {
    const stored = localStorage.getItem(notifiedMessageKey(uid));
    return new Set(stored ? (JSON.parse(stored) as string[]) : []);
  } catch {
    return new Set();
  }
}

export default function SessionNotifier() {
  const { user, userProfile } = useAuth();
  const [sessionUpdate, setSessionUpdate] = useState<{
    id: string;
    kind: "ready" | "declined" | "message";
    counsellorName?: string;
    title?: string;
    message: string;
  } | null>(null);
  const checkingRef = useRef(false);
  const checkingMessagesRef = useRef(false);
  const checkingDurableRef = useRef(false);
  const activeSessionIdsRef = useRef(new Set<string>());
  const isMember =
    userProfile?.role !== "admin" &&
    userProfile?.role !== "counsellor" &&
    userProfile?.registrationIntent !== "counsellor";
  const isCounsellor =
    userProfile?.role === "counsellor" ||
    userProfile?.registrationIntent === "counsellor";

  const checkDurableUpdates = useCallback(async () => {
    if (!user?.uid || checkingDurableRef.current) return;
    checkingDurableRef.current = true;
    try {
      const response = await authenticatedFetch("/api/care-notifications", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return;
      const updates = (payload.data?.notifications || []) as Array<{
        id: string;
        sessionId: string;
        type: CareNotificationType;
      }>;
      for (const update of updates) {
        const content = describeCareNotification(update.type);
        const href = `/sessions/${update.sessionId}`;
        storeNotification({
          id: `care-${update.id}`,
          type: "counsellor_update",
          title: content.title,
          message: content.message,
          href,
          timestamp: new Date(),
          read: false,
        }, user.uid);
        showBrowserNotification(content.title, {
          body: "Open SisterCare to view this private care update.",
          tag: `care-${update.id}`,
          data: { href },
        });
        setSessionUpdate({
          id: update.sessionId,
          kind: update.type === "session_accepted" ? "ready" : update.type === "session_rematching" ? "declined" : "message",
          title: content.title,
          message: content.message,
        });
      }
      if (updates.length) {
        await authenticatedFetch("/api/care-notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: updates.map((update) => update.id) }),
        });
      }
    } catch {
      // Existing authenticated polling remains available while durable care
      // updates reconnect; no sensitive details are placed in the error UI.
    } finally {
      checkingDurableRef.current = false;
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !userProfile) return;
    void checkDurableUpdates();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void checkDurableUpdates();
    }, 5_000);
    const reconnect = () => void checkDurableUpdates();
    window.addEventListener("online", reconnect);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", reconnect);
    };
  }, [checkDurableUpdates, user?.uid, userProfile]);

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

  const notifyIncomingMessage = useCallback(
    (params: { id: string; sessionId: string; senderId: string }) => {
      if (!user?.uid || params.senderId === user.uid) return;
      const notified = readNotifiedMessages(user.uid);
      if (notified.has(params.id)) return;
      notified.add(params.id);
      localStorage.setItem(
        notifiedMessageKey(user.uid),
        JSON.stringify([...notified].slice(-500)),
      );
      const href = `/sessions/${params.sessionId}`;
      if (
        document.visibilityState === "visible" &&
        window.location.pathname === href
      ) {
        return;
      }
      const title = "New private message";
      const message = isCounsellor
        ? "A member sent a message in your private care room."
        : "Your counsellor replied in your private support room.";
      storeNotification(
        {
          id: `session-message-${params.id}`,
          type: "session_message",
          title,
          message,
          href,
          timestamp: new Date(),
          read: false,
        },
        user.uid,
      );
      showBrowserNotification(title, {
        body: "Open SisterCare to view the private message.",
        tag: `session-message-${params.id}`,
        data: { href },
      });
      setSessionUpdate({
        id: params.sessionId,
        kind: "message",
        message,
      });
    },
    [isCounsellor, user?.uid],
  );

  useEffect(() => {
    if (
      !user?.uid ||
      !userProfile ||
      userProfile.role === "admin" ||
      (!isMember && !isCounsellor)
    ) {
      return;
    }
    const uid = user.uid;
    const checkMessages = async () => {
      if (checkingMessagesRef.current) return;
      checkingMessagesRef.current = true;
      try {
        const sessions = isCounsellor
          ? (await listCounsellorSessions()).assigned
          : await listMySessions();
        const active = sessions.filter((session) => session.state === "active");
        activeSessionIdsRef.current = new Set(
          active.map((session) => session.id),
        );
        for (const session of active) {
          const response = await authenticatedFetch(
            `/api/sessions/${session.id}/messages`,
            { cache: "no-store" },
          );
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) continue;
          const incoming = (payload.data?.messages || [])
            .filter(
              (message: { id?: unknown; senderId?: unknown }) =>
                typeof message.id === "string" &&
                typeof message.senderId === "string" &&
                message.senderId !== uid,
            )
            .at(-1) as
            | { id: string; senderId: string }
            | undefined;
          if (incoming) {
            notifyIncomingMessage({
              id: incoming.id,
              sessionId: session.id,
              senderId: incoming.senderId,
            });
          }
        }
      } catch {
        // The room-level authenticated poll remains the final fallback.
      } finally {
        checkingMessagesRef.current = false;
      }
    };

    void checkMessages();
    const interval = window.setInterval(() => void checkMessages(), 4_000);
    const channel = getSupabaseBrowserClient()
      .channel(`session-message-notifier:${uid}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_messages",
        },
        (payload) => {
          const message = messageFromRealtimeRow(
            payload.new as Record<string, unknown>,
          );
          const sessionId =
            typeof payload.new.session_id === "string"
              ? payload.new.session_id
              : null;
          if (
            message &&
            sessionId &&
            activeSessionIdsRef.current.has(sessionId)
          ) {
            notifyIncomingMessage({
              id: message.id,
              sessionId,
              senderId: message.senderId,
            });
          }
        },
      )
      .subscribe();
    return () => {
      window.clearInterval(interval);
      void getSupabaseBrowserClient().removeChannel(channel);
      activeSessionIdsRef.current = new Set();
    };
  }, [
    isCounsellor,
    isMember,
    notifyIncomingMessage,
    user?.uid,
    userProfile,
  ]);

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
          {sessionUpdate.title || (sessionUpdate.kind === "ready"
            ? "Your counsellor is ready"
            : sessionUpdate.kind === "message"
              ? "New private message"
              : "Counsellor request update")}
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
        {sessionUpdate.kind === "ready"
          ? "Open room"
          : sessionUpdate.kind === "message"
            ? "Open conversation"
            : "View update"}
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

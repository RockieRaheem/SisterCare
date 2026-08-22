"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import CounsellorShell from "@/components/counsellor/CounsellorShell";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import { CounsellingSession, SessionState } from "@/types";
import DailyAudioCall from "@/components/features/DailyAudioCall";
import {
  queuedWriteMessage,
  submitOfflineCapableWrite,
} from "@/lib/offlineQueue";
import {
  mergeSessionMessages,
  messageFromRealtimeRow,
  reviveSessionMessage,
  SessionRoomMessage,
} from "@/lib/sessionMessaging";
import {
  getSessionStatusDescription,
  getSessionDetail,
  transitionSession,
  SESSION_STATE_META,
} from "@/lib/sessionsClient";

export default function SessionRoomPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [session, setSession] = useState<CounsellingSession | null>(null);
  const [messages, setMessages] = useState<SessionRoomMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioAccess, setAudioAccess] = useState<{
    roomUrl: string;
    token: string;
  } | null>(null);
  const [incomingAudio, setIncomingAudio] = useState(false);
  const [audioState, setAudioState] = useState<
    "idle" | "connecting" | "active" | "disconnected" | "failed"
  >("idle");
  const [messageSync, setMessageSync] = useState<
    "connecting" | "live" | "fallback"
  >("connecting");
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);

  const uid = user?.uid;
  const state: SessionState | null = session?.state || null;
  const isSessionUser = Boolean(session && uid && session.userId === uid);
  const isCounsellor = Boolean(
    session && uid && session.counsellorId === uid,
  );
  const usesProfessionalWorkspace =
    userProfile?.role === "counsellor" ||
    userProfile?.registrationIntent === "counsellor" ||
    isCounsellor;

  const loadDetail = useCallback(async () => {
    try {
      const detail = await getSessionDetail(sessionId);
      setSession(detail);
      setFeedbackSent(detail.state === "feedback_received");
      setError(null);
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(
        status === 403
          ? "You don't have access to this session."
          : status === 404
            ? "This session doesn't exist."
            : "Couldn't load this session.",
      );
    }
  }, [sessionId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }
    if (user) loadDetail();
  }, [user, authLoading, router, loadDetail]);

  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadDetail();
    }, 4_000);
    return () => window.clearInterval(interval);
  }, [loadDetail, user]);

  // Realtime is the fast path. Authenticated polling is the fallback when a
  // browser or network blocks the realtime socket.
  useEffect(() => {
    if (!user) return;

    const supabase = getSupabaseBrowserClient();
    const loadMessages = async () => {
      try {
        const response = await authenticatedFetch(
          `/api/sessions/${sessionId}/messages`,
          { cache: "no-store" },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Message history failed");
        setMessages(
          (payload.data.messages || []).map(reviveSessionMessage),
        );
      } catch (loadError) {
        console.warn("Session message load failed:", loadError);
        setError("Messages could not be refreshed. Check your connection.");
      }
    };
    void loadMessages();
    const messagePoll = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadMessages();
    }, 2_500);
    const channel = supabase.channel(`session-room:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const incoming = messageFromRealtimeRow(
            payload.new as Record<string, unknown>,
          );
          if (incoming) {
            setMessages((current) =>
              mergeSessionMessages(current, [incoming]),
            );
          } else {
            void loadMessages();
          }
        },
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "counselling_sessions", filter: `id=eq.${sessionId}` }, () => void loadDetail())
      .subscribe((status) => {
        setMessageSync(status === "SUBSCRIBED" ? "live" : "fallback");
        if (status === "SUBSCRIBED") void loadMessages();
      });
    return () => {
      window.clearInterval(messagePoll);
      void supabase.removeChannel(channel);
    };
  }, [loadDetail, user, sessionId]);

  useEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: messages.length > 1 ? "smooth" : "auto",
    });
  }, [messages.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !uid || state !== "active") return;
    setSending(true);
    try {
      const result = await submitOfflineCapableWrite({
        userId: uid,
        url: `/api/sessions/${sessionId}/messages`,
        method: "POST",
        body: { text },
      });
      setDraft("");
      if (result.state === "queued") {
        setMessages((current) => mergeSessionMessages(current, [{
          id: result.localId,
          clientMessageId: result.localId,
          senderId: uid,
          senderRole: isCounsellor ? "counsellor" : "user",
          text,
          createdAt: new Date(),
        }]));
        setError(queuedWriteMessage(result.reason));
      } else {
        const payload = result.payload as { data?: { message?: Parameters<typeof reviveSessionMessage>[0] } };
        if (!payload.data?.message) throw new Error("Message was not confirmed by the service");
        const saved = reviveSessionMessage(payload.data.message);
        setMessages((current) => mergeSessionMessages(current, [saved]));
        setError(null);
      }
    } catch {
      setError("Message failed to send. Check your connection.");
    } finally {
      setSending(false);
    }
  };

  const doTransition = async (
    action: "cancel" | "end" | "escalate" | "feedback",
    extra?: { rating?: number; comment?: string },
  ) => {
    try {
      await transitionSession(sessionId, action, extra);
      await loadDetail();
    } catch (transitionError) {
      setError(
        transitionError instanceof Error
          ? transitionError.message
          : "Action failed. Please try again.",
      );
    }
  };

  const audioAction = useCallback(
    async (
      action: "connected" | "leave" | "end" | "fail",
      extra?: Record<string, unknown>,
    ) => {
      const response = await authenticatedFetch(`/api/sessions/${sessionId}/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(extra || {}) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Audio action failed.");
      return payload;
    },
    [sessionId],
  );

  const startAudio = async () => {
    setAudioBusy(true);
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser does not support private in-app audio.");
      }
      const permission = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      permission.getTracks().forEach((track) => track.stop());
      const response = await authenticatedFetch(`/api/sessions/${sessionId}/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", microphoneConsent: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload.error ||
            "Audio could not connect. Continue safely in this text conversation.",
        );
      }
      if (
        typeof payload.data?.roomUrl !== "string" ||
        typeof payload.data?.token !== "string"
      ) {
        throw new Error("Daily returned incomplete private call access.");
      }
      setAudioAccess({
        roomUrl: payload.data.roomUrl,
        token: payload.data.token,
      });
      setAudioState("connecting");
      setIncomingAudio(false);
    } catch (reason) {
      setAudioState("failed");
      setError(
        reason instanceof Error
          ? `${reason.message} You can continue by text here.`
          : "Audio could not connect. Continue safely by text here.",
      );
    } finally {
      setAudioBusy(false);
    }
  };

  const leaveAudio = useCallback(async () => {
    try {
      await audioAction("leave");
    } catch {}
    setAudioAccess(null);
    setAudioState("disconnected");
    setIncomingAudio(false);
  }, [audioAction]);

  const audioConnected = useCallback(() => {
    void audioAction("connected")
      .then((payload) => {
        setAudioState(
          payload.data?.call?.state === "active" ? "active" : "connecting",
        );
      })
      .catch(() => {
        setAudioState("failed");
        setError("Audio state could not be verified. Continue by text.");
      });
  }, [audioAction]);

  const audioDisconnected = useCallback(() => {
    setAudioAccess(null);
    setAudioState("disconnected");
    setIncomingAudio(false);
    void audioAction("leave").catch(() => undefined);
  }, [audioAction]);

  const audioFailed = useCallback(
    (failureCode: string) => {
      setAudioAccess(null);
      setAudioState("failed");
      setIncomingAudio(false);
      setError(
        "The audio connection ended unexpectedly. You can reconnect or continue by text.",
      );
      void audioAction("fail", { failureCode }).catch(() => undefined);
    },
    [audioAction],
  );

  const peerAudioConnected = useCallback(() => {
    setAudioState("active");
    setIncomingAudio(false);
  }, []);

  const peerAudioDisconnected = useCallback(() => {
    setAudioState("disconnected");
    setIncomingAudio(false);
  }, []);

  useEffect(() => {
    if (state !== "active") {
      setIncomingAudio(false);
      setAudioAccess(null);
      return;
    }
    const checkCallState = async () => {
      try {
        const response = await authenticatedFetch(`/api/sessions/${sessionId}/audio`, {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        const call = payload.data?.call;
        const callState = call?.state;
        if (!response.ok || !callState) {
          setIncomingAudio(false);
          return;
        }
        setIncomingAudio(
          call.otherParticipantConnected === true && !audioAccess,
        );
        if (
          callState === "disconnected" &&
          call.otherParticipantConnected !== true
        ) {
          setAudioState("disconnected");
        }
        if (
          callState === "ended" ||
          callState === "failed" ||
          callState === "cancelled" ||
          callState === "expired"
        ) {
          setAudioAccess(null);
          setIncomingAudio(false);
          setAudioState(callState === "failed" ? "failed" : "idle");
          if (callState === "failed") {
            setError("The private audio connection ended. Continue safely by text.");
          }
        }
      } catch {
        // The embedded provider remains authoritative during brief API outages.
      }
    };
    void checkCallState();
    const interval = window.setInterval(() => void checkCallState(), 5_000);
    return () => window.clearInterval(interval);
  }, [audioAccess, sessionId, state]);

  if (error && !session) {
    return (
      <SessionShell professional={usesProfessionalWorkspace}>
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-card-dark">
          <p className="text-gray-700 dark:text-gray-300">{error}</p>
        </div>
      </SessionShell>
    );
  }
  if (!session || !state) {
    return (
      <SessionShell professional={usesProfessionalWorkspace}>
        <div className="py-16 text-center text-gray-400">Loading session…</div>
      </SessionShell>
    );
  }

  const meta = SESSION_STATE_META[state];
  const showComposer = state === "active";
  const showFeedback =
    isSessionUser && (state === "completed" || state === "feedback_received");

  return (
    <SessionShell professional={usesProfessionalWorkspace}>
      {/* Session header */}
      <div className="mb-4 flex min-w-0 flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-card-dark sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white">
            {isSessionUser
              ? session.counsellorName || "Your counsellor"
              : "Support session"}
          </p>
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badgeClass}`}
          >
            {meta.label}
          </span>
        </div>
        {isSessionUser && (state === "requested" || state === "matched") && (
          <button
            type="button"
            onClick={() => doTransition("cancel")}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Cancel request
          </button>
        )}
        {state === "active" && (
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
            <button
              type="button"
              onClick={startAudio}
              disabled={audioBusy || Boolean(audioAccess)}
              className="col-span-2 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 sm:col-span-1"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">call</span>
              {audioBusy
                ? "Preparing…"
                : audioState === "connecting"
                  ? "Connecting…"
                  : incomingAudio
                    ? "Join call"
                    : audioState === "disconnected"
                      ? "Reconnect"
                      : "Join private call"}
            </button>
            {isCounsellor && (
              <button
                onClick={() => doTransition("escalate")}
                className="min-h-11 rounded-xl border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
              >
                Escalate
              </button>
            )}
            <button
              onClick={() => doTransition("end")}
              className="min-h-11 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              End session
            </button>
          </div>
        )}
      </div>

      {isSessionUser && (
        <div className="mb-4 flex justify-end">
          <Link href={`/report?type=session&targetId=${encodeURIComponent(sessionId)}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-text-secondary hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20 dark:hover:text-red-300">
            <span className="material-symbols-outlined text-lg" aria-hidden="true">report</span>
            Report a concern about this session
          </Link>
        </div>
      )}

      {isSessionUser &&
        session.lastDeclinedAt &&
        (state === "requested" || state === "matched") && (
          <div
            role="status"
            className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
          >
            <span
              className="material-symbols-outlined mt-0.5 text-xl"
              aria-hidden="true"
            >
              person_search
            </span>
            <div>
              <p className="text-sm font-bold">Counsellor request update</p>
              <p className="mt-0.5 text-sm">
                {getSessionStatusDescription(session)}
              </p>
            </div>
          </div>
        )}

      {error && (
        <div className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          {error}
        </div>
      )}

      {incomingAudio && !audioAccess && (
        <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-fuchsia-800 dark:bg-fuchsia-950/20">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-dark text-white">
              <span className="material-symbols-outlined">call</span>
            </span>
            <div>
              <p className="text-sm font-extrabold text-text-primary dark:text-white">
                Private audio is ready
              </p>
              <p className="text-xs text-text-secondary">
                The other participant opened the audio room. Recording is off.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void startAudio()}
            disabled={audioBusy}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-dark px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-lg">mic</span>
            {audioBusy ? "Preparing…" : "Join private audio"}
          </button>
        </section>
      )}

      {audioAccess && (
        <section className="mb-4 overflow-hidden rounded-2xl border border-primary/20 bg-slate-950 text-white">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-bold">
                {audioState === "active"
                  ? "Private audio connected"
                  : audioState === "disconnected"
                    ? "The other participant disconnected"
                    : "Connecting private audio"}
              </p>
              <p className="text-xs text-white/65">Audio only · phone numbers hidden · recording off</p>
            </div>
            <button
              type="button"
              onClick={() => void leaveAudio()}
              className="min-h-10 rounded-xl bg-red-600 px-4 text-xs font-bold text-white"
            >
              Leave call
            </button>
          </div>
          <DailyAudioCall
            roomUrl={audioAccess.roomUrl}
            token={audioAccess.token}
            onConnected={audioConnected}
            onDisconnected={audioDisconnected}
            onPeerConnected={peerAudioConnected}
            onPeerDisconnected={peerAudioDisconnected}
            onFailure={audioFailed}
          />
        </section>
      )}

      {/* Messages */}
      <div
        ref={messagesViewportRef}
        className={`h-[clamp(16rem,44dvh,36rem)] min-w-0 space-y-3 overflow-y-auto overscroll-contain border border-gray-200 bg-white p-3 [scrollbar-gutter:stable] dark:border-gray-700 dark:bg-card-dark sm:p-4 ${
          showComposer ? "mb-0 rounded-t-2xl" : "mb-4 rounded-2xl"
        }`}
        aria-live="polite"
      >
        {state === "active" && (
          <div className="flex justify-end">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  messageSync === "live"
                    ? "bg-emerald-500"
                    : "animate-pulse bg-amber-500"
                }`}
              />
              {messageSync === "live"
                ? "Messages update live"
                : "Reconnecting · messages still refresh automatically"}
            </span>
          </div>
        )}
        {state === "matched" || state === "requested" ? (
          <p className="py-10 text-center text-sm text-gray-500">
            {getSessionStatusDescription(session)}
          </p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            {showComposer
              ? "You're connected. Say hello — this space is private. 💗"
              : "No messages in this session."}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === uid;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] min-w-0 rounded-2xl px-4 py-2.5 text-sm sm:max-w-[80%] ${
                    mine
                      ? "rounded-br-md bg-primary-dark text-white"
                      : "rounded-bl-md bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  {m.createdAt && (
                    <p
                      className={`mt-1 text-[10px] ${mine ? "text-fuchsia-100" : "text-gray-400"}`}
                    >
                      {m.createdAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      {showComposer && (
        <div
          className={`sticky z-20 flex min-w-0 gap-2 rounded-b-2xl border border-t-0 border-border-light bg-bg-light/95 p-2.5 shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur dark:border-border-dark dark:bg-bg-dark/95 sm:p-3 ${
            isSessionUser
              ? "bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px))] md:bottom-0"
              : "bottom-0"
          }`}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoComplete="off"
            enterKeyHint="send"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a message…"
            className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-card-dark dark:text-white sm:px-4"
          />
          <button
            onClick={send}
            disabled={sending || !draft.trim()}
            className="min-h-12 shrink-0 rounded-xl bg-primary-dark px-4 py-3 text-sm font-semibold text-white hover:bg-primary-dark/90 disabled:opacity-50 sm:px-5"
          >
            Send
          </button>
        </div>
      )}

      {/* Feedback */}
      {showFeedback && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-card-dark">
          {feedbackSent ? (
            <p className="text-center text-sm text-gray-600 dark:text-gray-300">
              Thank you for your feedback. 💗
            </p>
          ) : (
            <>
              <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                How was your session?
              </p>
              <div className="mb-3 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setFeedbackRating(n)}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    className={`material-symbols-outlined text-3xl transition ${
                      n <= feedbackRating
                        ? "text-amber-400"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  >
                    star
                  </button>
                ))}
              </div>
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Anything you'd like to share? (optional)"
                rows={2}
                className="mb-3 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-base focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-card-dark dark:text-white"
              />
              <button
                onClick={() =>
                  doTransition("feedback", {
                    rating: feedbackRating,
                    comment: feedbackComment.trim() || undefined,
                  })
                }
                disabled={feedbackRating === 0}
                className="w-full rounded-xl bg-primary-dark py-2.5 text-sm font-semibold text-white hover:bg-primary-dark/90 disabled:opacity-50"
              >
                Submit feedback
              </button>
            </>
          )}
        </div>
      )}
    </SessionShell>
  );
}

function SessionShell({
  children,
  professional,
}: {
  children: React.ReactNode;
  professional: boolean;
}) {
  if (professional) {
    return (
      <CounsellorShell>
        <div className="mx-auto w-full max-w-4xl min-w-0">{children}</div>
      </CounsellorShell>
    );
  }

  return (
    <div className="app-page">
      <Header variant="app" />
      <main className="main-content mx-auto w-full max-w-3xl min-w-0 overflow-x-clip px-4 pt-7 sm:px-6">
        {children}
      </main>
    </div>
  );
}

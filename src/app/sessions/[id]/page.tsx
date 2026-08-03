"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/authClient";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import { CounsellingSession, SessionState } from "@/types";
import {
  getSessionDetail,
  transitionSession,
  SESSION_STATE_META,
} from "@/lib/sessionsClient";

interface RoomMessage {
  id: string;
  senderId: string;
  senderRole: "user" | "counsellor";
  text: string;
  createdAt: Date | null;
}

export default function SessionRoomPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [session, setSession] = useState<CounsellingSession | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioJoinUrl, setAudioJoinUrl] = useState<string | null>(null);
  const [incomingAudio, setIncomingAudio] = useState(false);
  const [audioState, setAudioState] = useState<
    "idle" | "connecting" | "active" | "failed"
  >("idle");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const uid = auth.currentUser?.uid;
  const state: SessionState | null = session?.state || null;
  const isSessionUser = Boolean(session && uid && session.userId === uid);
  const isCounsellor = Boolean(
    session && uid && session.counsellorId === uid,
  );

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
        setMessages((payload.data.messages || []).map((message: RoomMessage & { createdAt?: string }) => ({
          ...message,
          createdAt: message.createdAt ? new Date(message.createdAt) : null,
        })));
      } catch (loadError) {
        console.warn("Session message load failed:", loadError);
        setError("Messages could not be refreshed. Check your connection.");
      }
    };
    void loadMessages();
    const messagePoll = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadMessages();
    }, 4_000);
    const channel = supabase.channel(`session-room:${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_messages", filter: `session_id=eq.${sessionId}` }, () => void loadMessages())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "counselling_sessions", filter: `id=eq.${sessionId}` }, () => void loadDetail())
      .subscribe();
    return () => {
      window.clearInterval(messagePoll);
      void supabase.removeChannel(channel);
    };
  }, [loadDetail, user, sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !uid || state !== "active") return;
    setSending(true);
    try {
      const response = await authenticatedFetch(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Message failed to send");
      const saved = payload.data.message as RoomMessage & { createdAt?: string };
      setMessages((current) =>
        current.some((message) => message.id === saved.id)
          ? current
          : [
              ...current,
              {
                ...saved,
                createdAt: saved.createdAt ? new Date(saved.createdAt) : new Date(),
              },
            ],
      );
      setDraft("");
    } catch {
      setError("Message failed to send. Check your connection.");
    } finally {
      setSending(false);
    }
  };

  const doTransition = async (
    action: "end" | "escalate" | "feedback",
    extra?: { rating?: number; comment?: string },
  ) => {
    try {
      await transitionSession(sessionId, action, extra);
      await loadDetail();
    } catch {
      setError("Action failed. Please try again.");
    }
  };

  const audioAction = useCallback(
    async (action: "connected" | "end" | "fail", extra?: Record<string, unknown>) => {
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
      setAudioJoinUrl(payload.data.joinUrl);
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

  const endAudio = useCallback(async () => {
    try {
      await audioAction("end");
    } catch {}
    setAudioJoinUrl(null);
    setAudioState("idle");
    setIncomingAudio(false);
  }, [audioAction]);

  useEffect(() => {
    if (!audioJoinUrl) return;
    const trustedOrigin = new URL(audioJoinUrl).origin;
    const receiveProviderState = (event: MessageEvent) => {
      if (event.origin !== trustedOrigin || !event.data || typeof event.data !== "object") return;
      if (event.data.type === "sistercare.audio.connected") {
        setAudioState("active");
        void audioAction("connected").catch(() => {
          setAudioState("failed");
          setError("Audio state could not be verified. Continue by text.");
        });
      }
      if (event.data.type === "sistercare.audio.ended") void endAudio();
      if (event.data.type === "sistercare.audio.failed") {
        setAudioState("failed");
        setAudioJoinUrl(null);
        setError("The audio connection ended unexpectedly. Continue by text here.");
        void audioAction("fail", { failureCode: "provider_connection_failed" }).catch(() => {});
      }
    };
    window.addEventListener("message", receiveProviderState);
    return () => window.removeEventListener("message", receiveProviderState);
  }, [audioAction, audioJoinUrl, endAudio]);

  useEffect(() => {
    if (state !== "active") {
      setIncomingAudio(false);
      return;
    }
    const checkCallState = async () => {
      try {
        const response = await authenticatedFetch(`/api/sessions/${sessionId}/audio`, {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        const callState = payload.data?.call?.state;
        if (!response.ok || !callState) {
          setIncomingAudio(false);
          return;
        }
        if (
          (callState === "connecting" || callState === "active") &&
          !audioJoinUrl
        ) {
          setIncomingAudio(true);
        }
        if (callState === "ended" || callState === "failed") {
          setAudioJoinUrl(null);
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
  }, [audioJoinUrl, sessionId, state]);

  if (error && !session) {
    return (
      <Shell>
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-card-dark">
          <p className="text-gray-700 dark:text-gray-300">{error}</p>
        </div>
      </Shell>
    );
  }
  if (!session || !state) {
    return (
      <Shell>
        <div className="py-16 text-center text-gray-400">Loading session…</div>
      </Shell>
    );
  }

  const meta = SESSION_STATE_META[state];
  const showComposer = state === "active";
  const showFeedback =
    isSessionUser && (state === "completed" || state === "feedback_received");

  return (
    <Shell>
      {/* Session header */}
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-card-dark">
        <div>
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
        {state === "active" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={startAudio}
              disabled={audioBusy || Boolean(audioJoinUrl)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">call</span>
              {audioBusy
                ? "Preparing…"
                : audioState === "connecting"
                  ? "Connecting…"
                  : incomingAudio
                    ? "Join call"
                    : "Start audio"}
            </button>
            {isCounsellor && (
              <button
                onClick={() => doTransition("escalate")}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
              >
                Escalate
              </button>
            )}
            <button
              onClick={() => doTransition("end")}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              End session
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          {error}
        </div>
      )}

      {incomingAudio && !audioJoinUrl && (
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

      {audioJoinUrl && (
        <section className="mb-4 overflow-hidden rounded-2xl border border-primary/20 bg-slate-950 text-white">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-bold">
                {audioState === "active" ? "Private audio connected" : "Connecting private audio"}
              </p>
              <p className="text-xs text-white/65">Audio only · phone numbers hidden · recording off</p>
            </div>
            <button
              type="button"
              onClick={() => void endAudio()}
              className="min-h-10 rounded-xl bg-red-600 px-4 text-xs font-bold text-white"
            >
              End call
            </button>
          </div>
          <iframe
            src={audioJoinUrl}
            title="Private SisterCare audio session"
            allow="microphone"
            className="h-56 w-full border-0 bg-slate-950"
            referrerPolicy="no-referrer"
          />
        </section>
      )}

      {/* Messages */}
      <div className="mb-4 min-h-[40vh] space-y-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-card-dark">
        {state === "matched" || state === "requested" ? (
          <p className="py-10 text-center text-sm text-gray-500">
            {meta.description}
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
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
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
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      {showComposer && (
        <div
          className={`sticky z-20 -mx-2 flex gap-2 border-t border-border-light bg-bg-light/95 px-2 py-3 backdrop-blur dark:border-border-dark dark:bg-bg-dark/95 ${
            isSessionUser
              ? "bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px))] md:bottom-0"
              : "bottom-0"
          }`}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a message…"
            className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-card-dark dark:text-white"
          />
          <button
            onClick={send}
            disabled={sending || !draft.trim()}
            className="rounded-xl bg-primary-dark px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark/90 disabled:opacity-50"
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
                className="mb-3 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-card-dark dark:text-white"
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
    </Shell>
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
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
  const [liveState, setLiveState] = useState<SessionState | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const uid = auth.currentUser?.uid;
  const state: SessionState | null = liveState || session?.state || null;
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

  // Live session state + messages, straight from Firestore under the
  // participant-scoped rules — no polling in the room itself.
  useEffect(() => {
    if (!user || !session) return;

    const unsubState = onSnapshot(
      doc(db, "sessions", sessionId),
      (snap) => {
        const s = snap.data()?.state as SessionState | undefined;
        if (s) {
          setLiveState(s);
          if (s === "feedback_received") setFeedbackSent(true);
        }
      },
      (err) => console.warn("Session state listener failed:", err),
    );

    const unsubMessages = onSnapshot(
      query(
        collection(db, "sessions", sessionId, "messages"),
        orderBy("createdAt", "asc"),
      ),
      (snap) => {
        setMessages(
          snap.docs.map((d) => ({
            id: d.id,
            senderId: d.data().senderId,
            senderRole: d.data().senderRole || "user",
            text: d.data().text || "",
            createdAt: d.data().createdAt?.toDate?.() || null,
          })),
        );
      },
      (err) => console.warn("Messages listener failed:", err),
    );

    return () => {
      unsubState();
      unsubMessages();
    };
  }, [user, session, sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !uid || state !== "active") return;
    setSending(true);
    try {
      await addDoc(collection(db, "sessions", sessionId, "messages"), {
        senderId: uid,
        senderRole: isSessionUser ? "user" : "counsellor",
        text,
        createdAt: serverTimestamp(),
      });
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

      {/* Messages */}
      <div className="mb-4 min-h-[40vh] space-y-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-card-dark">
        {state === "matched" || state === "requested" ? (
          <p className="py-10 text-center text-sm text-gray-500">
            {meta.description}
          </p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            {showComposer
              ? "You're connected. Say hello — this space is private. 💜"
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
                      ? "rounded-br-md bg-purple-600 text-white"
                      : "rounded-bl-md bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  {m.createdAt && (
                    <p
                      className={`mt-1 text-[10px] ${mine ? "text-purple-200" : "text-gray-400"}`}
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
        <div className="flex gap-2">
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
            className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:border-purple-500 focus:outline-none dark:border-gray-600 dark:bg-card-dark dark:text-white"
          />
          <button
            onClick={send}
            disabled={sending || !draft.trim()}
            className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
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
              Thank you for your feedback. 💜
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
                className="mb-3 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none dark:border-gray-600 dark:bg-card-dark dark:text-white"
              />
              <button
                onClick={() =>
                  doTransition("feedback", {
                    rating: feedbackRating,
                    comment: feedbackComment.trim() || undefined,
                  })
                }
                disabled={feedbackRating === 0}
                className="w-full rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
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
    <div className="min-h-screen bg-gray-50 dark:bg-background-dark">
      <Header variant="app" />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">{children}</main>
    </div>
  );
}

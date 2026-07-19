/**
 * Session engine — SERVER ONLY. The load-bearing wall of ARCHITECTURE_V2 §4.4.
 *
 * Owns the counselling-session lifecycle: request → match → accept → active →
 * complete → feedback, with the crisis lane (critical priority preempts the
 * queue and tracks the time-to-human SLA) and presence-aware matching.
 *
 * Design decisions (deviations from the blueprint, recorded in the guide):
 * - The queue IS the set of `requested` sessions — no separate collection.
 * - Matching only considers counsellors with a FRESH presence heartbeat, so
 *   sessions are only ever assigned to humans who can actually accept them.
 *   The legacy phone/WhatsApp handoff in the chat route stays as the parallel
 *   fallback when nobody is online.
 * - `accepted` is momentary: accepting auto-activates the room. Both
 *   timestamps are kept for the SLA metric.
 * - All transitions run through this module (admin SDK, API-gated); the room
 *   MESSAGES flow client-side under participant-scoped security rules.
 *
 * Requires the Admin SDK. Callers should 503 when isAuthEnforced() is false.
 */

import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import {
  assertTransition,
  evaluateTimeout,
  compareQueuePriority,
} from "../sessionStateMachine";
import { rankCounsellors } from "../counsellorMatching";
import { emitEvent } from "./events";
import {
  Counsellor,
  CounsellingSession,
  CounsellorSpecialty,
  SessionPriority,
  SessionState,
} from "@/types";

/** A heartbeat older than this means the counsellor is effectively offline. */
export const PRESENCE_TTL_SECONDS = 120;

const SESSIONS = "sessions";
const PRESENCE = "presence";

function requireDb() {
  const db = getAdminDb();
  if (!db) {
    throw new Error(
      "Session engine requires the Firebase Admin SDK (set FIREBASE_SERVICE_ACCOUNT_KEY)",
    );
  }
  return db;
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  return undefined;
}

function docToSession(
  id: string,
  data: FirebaseFirestore.DocumentData,
): CounsellingSession {
  return {
    id,
    userId: data.userId,
    counsellorId: data.counsellorId ?? null,
    counsellorName: data.counsellorName,
    state: data.state as SessionState,
    priority: (data.priority as SessionPriority) || "normal",
    reason: data.reason || "user_request",
    specialty: data.specialty,
    preferredLanguage: data.preferredLanguage,
    summary: data.summary || "",
    conversationId: data.conversationId,
    requestedAt: toDate(data.requestedAt) || new Date(),
    matchedAt: toDate(data.matchedAt),
    acceptedAt: toDate(data.acceptedAt),
    activeAt: toDate(data.activeAt),
    completedAt: toDate(data.completedAt),
    endedBy: data.endedBy,
    feedbackRating: data.feedbackRating,
    feedbackComment: data.feedbackComment,
    timeToHumanSeconds: data.timeToHumanSeconds,
    matchAttempts: data.matchAttempts || 0,
    declinedBy: data.declinedBy || [],
  };
}

// ============================================
// PRESENCE
// ============================================

/**
 * Record a counsellor heartbeat. Going available drains the queue — this is
 * the "keep routing when counsellors declare themselves free" behavior.
 */
export async function recordHeartbeat(
  counsellorUid: string,
  status: "available" | "busy",
): Promise<{ drained: number }> {
  const db = requireDb();
  const ref = db.collection(PRESENCE).doc(counsellorUid);
  const prev = await ref.get();
  const prevStatus = prev.exists ? prev.data()?.status : "offline";

  await ref.set({
    counsellorId: counsellorUid,
    status,
    lastHeartbeat: FieldValue.serverTimestamp(),
  });

  if (prevStatus !== status) {
    await emitEvent("counsellor.presence_changed", {
      counsellorId: counsellorUid,
      from: prevStatus,
      to: status,
    });
  }

  // Newly available (or freshly back) → try to drain the queue toward them.
  if (status === "available") {
    const result = await drainQueue();
    return { drained: result.matched };
  }
  return { drained: 0 };
}

export async function setOffline(counsellorUid: string): Promise<void> {
  const db = requireDb();
  await db.collection(PRESENCE).doc(counsellorUid).set(
    {
      counsellorId: counsellorUid,
      status: "offline",
      lastHeartbeat: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await emitEvent("counsellor.presence_changed", {
    counsellorId: counsellorUid,
    to: "offline",
  });
}

/** Counsellor uids with a fresh "available" heartbeat. */
async function getOnlineAvailableCounsellorIds(): Promise<Set<string>> {
  const db = requireDb();
  const cutoff = Timestamp.fromMillis(
    Date.now() - PRESENCE_TTL_SECONDS * 1000,
  );
  const snapshot = await db
    .collection(PRESENCE)
    .where("status", "==", "available")
    .get();

  const online = new Set<string>();
  for (const doc of snapshot.docs) {
    const hb = doc.data().lastHeartbeat;
    if (hb instanceof Timestamp && hb.toMillis() >= cutoff.toMillis()) {
      online.add(doc.id);
    }
  }
  return online;
}

// ============================================
// MATCHING
// ============================================

/**
 * Try to assign the best ONLINE counsellor to a requested session.
 * Returns true when a match was made.
 */
export async function attemptMatch(sessionId: string): Promise<boolean> {
  const db = requireDb();
  const ref = db.collection(SESSIONS).doc(sessionId);
  const snap = await ref.get();
  if (!snap.exists) return false;

  const session = docToSession(snap.id, snap.data()!);
  if (session.state !== "requested") return false;

  const online = await getOnlineAvailableCounsellorIds();
  const eligible = [...online].filter((id) => !session.declinedBy.includes(id));
  if (eligible.length === 0) return false;

  // Load directory profiles for the online counsellors (doc id == auth uid
  // for real counsellors; static demo entries have no presence, so they can
  // never be matched here — by design).
  const profiles: Counsellor[] = [];
  for (const id of eligible) {
    const doc = await db.collection("counsellors").doc(id).get();
    if (doc.exists) {
      profiles.push({
        id: doc.id,
        ...doc.data(),
        createdAt: toDate(doc.data()?.createdAt) || new Date(),
      } as Counsellor);
    } else {
      // Online counsellor without a directory profile yet — minimal stand-in
      // so a verified human still beats an empty queue.
      profiles.push({
        id,
        name: "Counsellor",
        title: "Counsellor",
        bio: "",
        specializations: ["Mental Health"],
        photoURL: "",
        status: "available",
        rating: 4,
        reviewCount: 0,
        yearsExperience: 1,
        languages: ["English"],
        phoneNumber: "",
        whatsappNumber: "",
        availableHours: {
          start: "00:00",
          end: "23:59",
          days: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ],
        },
        sessionCount: 0,
        verified: true,
        createdAt: new Date(),
      });
    }
  }

  // Load balancing across active sessions
  const loads = new Map<string, number>();
  const activeSnapshot = await db
    .collection(SESSIONS)
    .where("state", "in", ["matched", "accepted", "active"])
    .get();
  for (const doc of activeSnapshot.docs) {
    const cid = doc.data().counsellorId;
    if (cid) loads.set(cid, (loads.get(cid) || 0) + 1);
  }

  const best = rankCounsellors(
    profiles,
    {
      specialty: session.specialty as CounsellorSpecialty | undefined,
      preferredLanguage: session.preferredLanguage,
    },
    loads,
  );
  if (!best) return false;

  assertTransition(session.state, "matched");
  await ref.update({
    state: "matched",
    counsellorId: best.id,
    counsellorName: best.name,
    matchedAt: FieldValue.serverTimestamp(),
    matchAttempts: FieldValue.increment(1),
  });

  await emitEvent("session.matched", {
    sessionId,
    counsellorId: best.id,
    priority: session.priority,
    matchAttempts: session.matchAttempts + 1,
  });
  return true;
}

/**
 * Match every queued request against currently-online counsellors,
 * critical first, oldest first.
 */
export async function drainQueue(): Promise<{ matched: number }> {
  const db = requireDb();
  const snapshot = await db
    .collection(SESSIONS)
    .where("state", "==", "requested")
    .get();

  const queued = snapshot.docs
    .map((d) => docToSession(d.id, d.data()))
    .sort(compareQueuePriority);

  let matched = 0;
  for (const session of queued) {
    if (await attemptMatch(session.id)) matched++;
  }
  return { matched };
}

// ============================================
// LIFECYCLE
// ============================================

export async function createSessionRequest(params: {
  userId: string;
  reason: "user_request" | "risk_detected";
  priority: SessionPriority;
  summary: string;
  specialty?: CounsellorSpecialty;
  preferredLanguage?: string;
  conversationId?: string;
}): Promise<CounsellingSession> {
  const db = requireDb();

  // One live session per user: reuse an existing non-terminal one instead of
  // stacking duplicate requests from repeated "I need help" messages.
  const existing = await db
    .collection(SESSIONS)
    .where("userId", "==", params.userId)
    .where("state", "in", ["requested", "matched", "accepted", "active"])
    .limit(1)
    .get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    const session = docToSession(doc.id, doc.data()!);
    // Escalate priority in place if the situation worsened.
    if (params.priority === "critical" && session.priority !== "critical") {
      await doc.ref.update({ priority: "critical" });
      session.priority = "critical";
    }
    return session;
  }

  const payload: Record<string, unknown> = {
    userId: params.userId,
    counsellorId: null,
    state: "requested" satisfies SessionState,
    priority: params.priority,
    reason: params.reason,
    summary: params.summary.substring(0, 500),
    requestedAt: FieldValue.serverTimestamp(),
    matchAttempts: 0,
    declinedBy: [],
  };
  if (params.specialty) payload.specialty = params.specialty;
  if (params.preferredLanguage)
    payload.preferredLanguage = params.preferredLanguage;
  if (params.conversationId) payload.conversationId = params.conversationId;

  const ref = await db.collection(SESSIONS).add(payload);

  await emitEvent("session.requested", {
    sessionId: ref.id,
    userId: params.userId,
    priority: params.priority,
    reason: params.reason,
  });

  await attemptMatch(ref.id);

  const created = await ref.get();
  return docToSession(created.id, created.data()!);
}

/**
 * Counsellor accepts. For critical sessions still in the queue, any online
 * counsellor may claim them (first-accept-wins crisis lane); otherwise the
 * session must be matched to this counsellor. Accepting auto-activates the
 * room and stops the SLA clock.
 */
export async function acceptSession(
  sessionId: string,
  counsellorUid: string,
): Promise<CounsellingSession> {
  const db = requireDb();
  const ref = db.collection(SESSIONS).doc(sessionId);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Session not found");
    const session = docToSession(snap.id, snap.data()!);

    if (session.state === "requested" && session.priority === "critical") {
      // Crisis-lane claim: transition through matched in the same commit.
      assertTransition("requested", "matched");
      assertTransition("matched", "accepted");
    } else {
      if (session.counsellorId !== counsellorUid) {
        throw new Error("Session is not assigned to this counsellor");
      }
      assertTransition(session.state, "accepted");
    }
    assertTransition("accepted", "active");

    const now = new Date();
    const timeToHumanSeconds = Math.round(
      (now.getTime() - session.requestedAt.getTime()) / 1000,
    );

    tx.update(ref, {
      state: "active",
      counsellorId: counsellorUid,
      matchedAt: session.matchedAt
        ? Timestamp.fromDate(session.matchedAt)
        : FieldValue.serverTimestamp(),
      acceptedAt: FieldValue.serverTimestamp(),
      activeAt: FieldValue.serverTimestamp(),
      timeToHumanSeconds,
    });
    return { session, timeToHumanSeconds };
  });

  await emitEvent("session.accepted", {
    sessionId,
    counsellorId: counsellorUid,
    priority: result.session.priority,
    timeToHumanSeconds: result.timeToHumanSeconds,
  });
  await emitEvent("session.activated", { sessionId });

  const updated = await ref.get();
  return docToSession(updated.id, updated.data()!);
}

/** Counsellor declines a matched session → back to the queue, rematch. */
export async function declineSession(
  sessionId: string,
  counsellorUid: string,
): Promise<void> {
  const db = requireDb();
  const ref = db.collection(SESSIONS).doc(sessionId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Session not found");
  const session = docToSession(snap.id, snap.data()!);

  if (session.counsellorId !== counsellorUid) {
    throw new Error("Session is not assigned to this counsellor");
  }
  assertTransition(session.state, "requested");

  await ref.update({
    state: "requested",
    counsellorId: null,
    counsellorName: FieldValue.delete(),
    matchedAt: FieldValue.delete(),
    declinedBy: FieldValue.arrayUnion(counsellorUid),
  });
  await emitEvent("session.declined", { sessionId, counsellorId: counsellorUid });

  await attemptMatch(sessionId);
}

/** Either participant ends an active session. */
export async function endSession(
  sessionId: string,
  byUid: string,
): Promise<void> {
  const db = requireDb();
  const ref = db.collection(SESSIONS).doc(sessionId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Session not found");
  const session = docToSession(snap.id, snap.data()!);

  const isParticipant =
    byUid === session.userId || byUid === session.counsellorId;
  if (!isParticipant) throw new Error("Not a participant of this session");
  assertTransition(session.state, "completed");

  await ref.update({
    state: "completed",
    completedAt: FieldValue.serverTimestamp(),
    endedBy: byUid === session.userId ? "user" : "counsellor",
  });
  await emitEvent("session.completed", {
    sessionId,
    counsellorId: session.counsellorId,
    userId: session.userId,
    endedBy: byUid === session.userId ? "user" : "counsellor",
  });
}

/** Counsellor flags an emergency during an active session. */
export async function escalateSession(
  sessionId: string,
  counsellorUid: string,
): Promise<void> {
  const db = requireDb();
  const ref = db.collection(SESSIONS).doc(sessionId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Session not found");
  const session = docToSession(snap.id, snap.data()!);

  if (session.counsellorId !== counsellorUid) {
    throw new Error("Session is not assigned to this counsellor");
  }
  assertTransition(session.state, "escalated");

  await ref.update({
    state: "escalated",
    completedAt: FieldValue.serverTimestamp(),
  });
  await emitEvent("session.escalated", {
    sessionId,
    counsellorId: counsellorUid,
    userId: session.userId,
  });
}

/** User rates a completed session. Appends to the reputation ledger. */
export async function submitFeedback(
  sessionId: string,
  userUid: string,
  rating: number,
  comment?: string,
): Promise<void> {
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }
  const db = requireDb();
  const ref = db.collection(SESSIONS).doc(sessionId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Session not found");
  const session = docToSession(snap.id, snap.data()!);

  if (session.userId !== userUid) {
    throw new Error("Only the session's user can leave feedback");
  }
  assertTransition(session.state, "feedback_received");

  await ref.update({
    state: "feedback_received",
    feedbackRating: rating,
    ...(comment ? { feedbackComment: comment.substring(0, 1000) } : {}),
  });

  // Append-only reputation ledger (ARCHITECTURE_V2 §4.9). Score computation
  // is Phase 4; the ledger starts accumulating truth now.
  await db.collection("reputation_events").add({
    type: "session_feedback",
    sessionId,
    counsellorId: session.counsellorId,
    userId: userUid,
    rating,
    ...(comment ? { comment: comment.substring(0, 1000) } : {}),
    createdAt: FieldValue.serverTimestamp(),
  });

  await emitEvent("feedback.received", {
    sessionId,
    counsellorId: session.counsellorId,
    rating,
  });
}

// ============================================
// QUERIES & SWEEPER
// ============================================

export async function getSession(
  sessionId: string,
): Promise<CounsellingSession | null> {
  const db = requireDb();
  const snap = await db.collection(SESSIONS).doc(sessionId).get();
  return snap.exists ? docToSession(snap.id, snap.data()!) : null;
}

export async function listSessionsForUser(
  uid: string,
): Promise<CounsellingSession[]> {
  const db = requireDb();
  const snapshot = await db
    .collection(SESSIONS)
    .where("userId", "==", uid)
    .get();
  return snapshot.docs
    .map((d) => docToSession(d.id, d.data()))
    .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
}

export async function listSessionsForCounsellor(uid: string): Promise<{
  assigned: CounsellingSession[];
  openCritical: CounsellingSession[];
}> {
  const db = requireDb();
  const [assignedSnap, criticalSnap] = await Promise.all([
    db.collection(SESSIONS).where("counsellorId", "==", uid).get(),
    db
      .collection(SESSIONS)
      .where("state", "==", "requested")
      .where("priority", "==", "critical")
      .get(),
  ]);

  const assigned = assignedSnap.docs
    .map((d) => docToSession(d.id, d.data()))
    .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  const openCritical = criticalSnap.docs
    .map((d) => docToSession(d.id, d.data()))
    .filter((s) => !s.declinedBy.includes(uid))
    .sort(compareQueuePriority);

  return { assigned, openCritical };
}

/**
 * Periodic sweep (cron or admin-triggered): rematch stale matched sessions,
 * expire stale normal requests, then drain the queue.
 */
export async function sweepSessions(): Promise<{
  rematched: number;
  expired: number;
  drained: number;
}> {
  const db = requireDb();
  const now = new Date();
  let rematched = 0;
  let expired = 0;

  const openSnap = await db
    .collection(SESSIONS)
    .where("state", "in", ["requested", "matched"])
    .get();

  for (const doc of openSnap.docs) {
    const session = docToSession(doc.id, doc.data());
    const action = evaluateTimeout(session, now);

    if (action === "rematch" && session.counsellorId) {
      await doc.ref.update({
        state: "requested",
        counsellorId: null,
        counsellorName: FieldValue.delete(),
        matchedAt: FieldValue.delete(),
        declinedBy: FieldValue.arrayUnion(session.counsellorId),
      });
      await emitEvent("session.rematch_timeout", {
        sessionId: session.id,
        timedOutCounsellorId: session.counsellorId,
      });
      rematched++;
    } else if (action === "expire") {
      await doc.ref.update({
        state: "expired",
        completedAt: FieldValue.serverTimestamp(),
      });
      await emitEvent("session.expired", {
        sessionId: session.id,
        userId: session.userId,
      });
      expired++;
    }
  }

  const { matched } = await drainQueue();
  return { rematched, expired, drained: matched };
}

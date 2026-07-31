/**
 * Supabase-backed counselling session lifecycle and presence engine.
 *
 * All writes use the server-only service client. Public routes authenticate
 * and authorize callers before invoking these operations.
 */
import { getSupabaseAdmin } from "../supabaseAdmin";
import {
  assertTransition,
  compareQueuePriority,
  evaluateTimeout,
} from "../sessionStateMachine";
import { rankCounsellors } from "../counsellorMatching";
import {
  evaluateCounsellorEligibility,
  evaluateCrisisEscalation,
} from "../counsellorOperations";
import { emitEvent } from "./events";
import { openCrisisIncident } from "./incidents";
import { sanitizeCounsellorSummary } from "../counsellorPrivacy";
import {
  Counsellor,
  CounsellingSession,
  CounsellorSpecialty,
  SessionPriority,
  SessionState,
} from "@/types";

export const PRESENCE_TTL_SECONDS = 120;
const LIVE_STATES: SessionState[] = ["matched", "accepted", "active"];
type Json = Record<string, unknown>;
type Row = Record<string, unknown>;

const db = () => getSupabaseAdmin();
const nowIso = () => new Date().toISOString();
const date = (value: unknown, fallback?: Date) =>
  value ? new Date(String(value)) : fallback;
const check = (error: { message?: string } | null) => {
  if (error) throw new Error(error.message || "Supabase operation failed");
};
const detailsOf = (row: Row): Json =>
  row.details && typeof row.details === "object" ? (row.details as Json) : {};

function rowToSession(row: Row): CounsellingSession {
  const details = detailsOf(row);
  return {
    id: String(row.id),
    userId: String(row.user_id),
    counsellorId: row.counsellor_id ? String(row.counsellor_id) : null,
    counsellorName:
      typeof details.counsellorName === "string"
        ? details.counsellorName
        : undefined,
    state: row.state as SessionState,
    priority: (row.priority as SessionPriority) || "normal",
    reason:
      details.reason === "risk_detected" ? "risk_detected" : "user_request",
    specialty: details.specialty as CounsellorSpecialty | undefined,
    preferredLanguage:
      typeof details.preferredLanguage === "string"
        ? details.preferredLanguage
        : undefined,
    summary: sanitizeCounsellorSummary(details.summary),
    conversationId:
      typeof details.conversationId === "string"
        ? details.conversationId
        : undefined,
    requestedAt: date(row.requested_at, new Date())!,
    matchedAt: date(row.matched_at),
    acceptedAt: date(row.accepted_at),
    activeAt: date(row.active_at),
    completedAt: date(row.completed_at),
    endedBy:
      details.endedBy === "user" || details.endedBy === "counsellor"
        ? details.endedBy
        : undefined,
    feedbackRating:
      typeof details.feedbackRating === "number"
        ? details.feedbackRating
        : undefined,
    feedbackComment:
      typeof details.feedbackComment === "string"
        ? details.feedbackComment
        : undefined,
    timeToHumanSeconds:
      typeof row.time_to_human_seconds === "number"
        ? row.time_to_human_seconds
        : undefined,
    matchAttempts:
      typeof row.match_attempts === "number" ? row.match_attempts : 0,
    declinedBy: Array.isArray(row.declined_by)
      ? row.declined_by.map(String)
      : [],
    crisisEscalationLevel:
      typeof details.crisisEscalationLevel === "number"
        ? details.crisisEscalationLevel
        : 0,
    emergencyFallbackRequired: details.emergencyFallbackRequired === true,
    incidentRequired: details.incidentRequired === true,
  };
}

function rowToCounsellor(row: Row): Counsellor {
  const profile =
    row.profile && typeof row.profile === "object" ? (row.profile as Json) : {};
  return {
    ...profile,
    id: String(row.id),
    name:
      typeof profile.name === "string" ? profile.name : "SisterCare counsellor",
    title: typeof profile.title === "string" ? profile.title : "Counsellor",
    bio: typeof profile.bio === "string" ? profile.bio : "",
    photoURL: typeof profile.photoURL === "string" ? profile.photoURL : "",
    specializations: Array.isArray(profile.specializations)
      ? (profile.specializations as CounsellorSpecialty[])
      : [],
    languages: Array.isArray(profile.languages)
      ? profile.languages.map(String)
      : ["English"],
    rating: typeof profile.rating === "number" ? profile.rating : 0,
    reviewCount:
      typeof profile.reviewCount === "number" ? profile.reviewCount : 0,
    yearsExperience:
      typeof profile.yearsExperience === "number"
        ? profile.yearsExperience
        : 0,
    phoneNumber:
      typeof profile.phoneNumber === "string" ? profile.phoneNumber : "",
    whatsappNumber:
      typeof profile.whatsappNumber === "string"
        ? profile.whatsappNumber
        : "",
    availableHours:
      profile.availableHours &&
      typeof profile.availableHours === "object" &&
      Array.isArray((profile.availableHours as Json).days)
        ? (profile.availableHours as Counsellor["availableHours"])
        : { start: "00:00", end: "23:59", days: [] },
    sessionCount:
      typeof profile.sessionCount === "number" ? profile.sessionCount : 0,
    status: row.status as Counsellor["status"],
    verified: row.verification_status === "verified",
    verificationStatus:
      row.verification_status as Counsellor["verificationStatus"],
    acceptingNewSessions: row.accepting_new_sessions === true,
    maxConcurrentSessions:
      typeof row.max_concurrent_sessions === "number"
        ? row.max_concurrent_sessions
        : 1,
    credentialExpiresAt: date(profile.credentialExpiresAt),
    crisisTrained: profile.crisisTrained === true,
    createdAt: date(row.created_at, new Date())!,
  };
}

async function fetchSession(sessionId: string): Promise<Row | null> {
  const { data, error } = await db()
    .from("counselling_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  check(error);
  return data as Row | null;
}

async function liveLoad(counsellorId: string, excludeSessionId?: string) {
  let query = db()
    .from("counselling_sessions")
    .select("id", { count: "exact", head: true })
    .eq("counsellor_id", counsellorId)
    .in("state", LIVE_STATES);
  if (excludeSessionId) query = query.neq("id", excludeSessionId);
  const { count, error } = await query;
  check(error);
  return count || 0;
}

async function assertCounsellorOperationallyEligible(
  counsellorId: string,
  priority: SessionPriority,
  excludeSessionId?: string,
) {
  const [{ data, error }, activeLoad] = await Promise.all([
    db().from("counsellors").select("*").eq("id", counsellorId).maybeSingle(),
    liveLoad(counsellorId, excludeSessionId),
  ]);
  check(error);
  if (!data) throw new Error("Verified counsellor profile required");
  const eligibility = evaluateCounsellorEligibility(
    rowToCounsellor(data as Row),
    { activeLoad, priority },
  );
  if (!eligibility.eligible) {
    throw new Error(
      `Counsellor is not operationally eligible: ${eligibility.reasons.join(", ")}`,
    );
  }
}

export async function recordHeartbeat(
  counsellorId: string,
  status: "available",
): Promise<{ drained: number; status: "available" | "in_session" }> {
  await assertCounsellorOperationallyEligible(counsellorId, "normal");
  const [{ data: current, error }, activeLoad] = await Promise.all([
    db()
      .from("counsellors")
      .select("status")
      .eq("id", counsellorId)
      .maybeSingle(),
    liveLoad(counsellorId),
  ]);
  check(error);
  if (!current) throw new Error("Verified counsellor profile required");
  const effectiveStatus = activeLoad > 0 ? "in_session" : status;
  const { error: updateError } = await db()
    .from("counsellors")
    .update({
      status: effectiveStatus,
      last_heartbeat: nowIso(),
      updated_at: nowIso(),
    })
    .eq("id", counsellorId);
  check(updateError);
  if (current.status !== effectiveStatus) {
    await emitEvent("counsellor.presence_changed", {
      counsellorId,
      from: current.status,
      to: effectiveStatus,
    });
  }
  if (effectiveStatus === "available") {
    const result = await drainQueue();
    return { drained: result.matched, status: effectiveStatus };
  }
  return { drained: 0, status: effectiveStatus };
}

export async function setOffline(counsellorId: string): Promise<void> {
  const { error } = await db()
    .from("counsellors")
    .update({ status: "offline", last_heartbeat: nowIso(), updated_at: nowIso() })
    .eq("id", counsellorId);
  check(error);
  await emitEvent("counsellor.presence_changed", {
    counsellorId,
    to: "offline",
  });
}

async function setCounsellorInSession(counsellorId: string) {
  const { error } = await db()
    .from("counsellors")
    .update({
      status: "in_session",
      last_heartbeat: nowIso(),
      updated_at: nowIso(),
    })
    .eq("id", counsellorId);
  check(error);
}

async function refreshCounsellorAvailability(counsellorId: string) {
  const [{ data, error }, activeLoad] = await Promise.all([
    db()
      .from("counsellors")
      .select("status,last_heartbeat")
      .eq("id", counsellorId)
      .maybeSingle(),
    liveLoad(counsellorId),
  ]);
  check(error);
  if (!data || data.status === "offline") return;
  const fresh =
    data.last_heartbeat &&
    new Date(data.last_heartbeat).getTime() >=
      Date.now() - PRESENCE_TTL_SECONDS * 1000;
  const status =
    activeLoad > 0 ? "in_session" : fresh ? "available" : "offline";
  const { error: updateError } = await db()
    .from("counsellors")
    .update({ status, updated_at: nowIso() })
    .eq("id", counsellorId);
  check(updateError);
}

export async function attemptMatch(sessionId: string): Promise<boolean> {
  const row = await fetchSession(sessionId);
  if (!row) return false;
  const session = rowToSession(row);
  if (session.state !== "requested") return false;

  const cutoff = new Date(
    Date.now() - PRESENCE_TTL_SECONDS * 1000,
  ).toISOString();
  const [{ data: staff, error }, { data: active, error: activeError }] =
    await Promise.all([
      db()
        .from("counsellors")
        .select("*")
        .eq("status", "available")
        .gte("last_heartbeat", cutoff),
      db()
        .from("counselling_sessions")
        .select("counsellor_id")
        .in("state", LIVE_STATES),
    ]);
  check(error);
  check(activeError);
  const loads = new Map<string, number>();
  for (const item of active || []) {
    if (item.counsellor_id) {
      loads.set(
        item.counsellor_id,
        (loads.get(item.counsellor_id) || 0) + 1,
      );
    }
  }
  const candidates = (staff || [])
    .map((item) => rowToCounsellor(item as Row))
    .filter(
      (item) =>
        !session.declinedBy.includes(item.id) &&
        evaluateCounsellorEligibility(item, {
          activeLoad: loads.get(item.id) || 0,
          priority: session.priority,
        }).eligible,
    );
  const best = rankCounsellors(
    candidates,
    {
      specialty: session.specialty,
      preferredLanguage: session.preferredLanguage,
    },
    loads,
  );
  if (!best) return false;

  const { data: claimed, error: claimError } = await db().rpc(
    "claim_counselling_session",
    {
      target_session_id: sessionId,
      target_counsellor_id: best.id,
      target_counsellor_name: best.name,
    },
  );
  check(claimError);
  if (claimed !== true) return false;
  await emitEvent("session.matched", {
    sessionId,
    counsellorId: best.id,
    priority: session.priority,
    matchAttempts: session.matchAttempts + 1,
  });
  return true;
}

export async function drainQueue(): Promise<{ matched: number }> {
  const { data, error } = await db()
    .from("counselling_sessions")
    .select("*")
    .eq("state", "requested");
  check(error);
  const queued = (data || [])
    .map((item) => rowToSession(item as Row))
    .sort(compareQueuePriority);
  let matched = 0;
  for (const session of queued) {
    if (await attemptMatch(session.id)) matched += 1;
  }
  return { matched };
}

export async function createSessionRequest(params: {
  userId: string;
  reason: "user_request" | "risk_detected";
  priority: SessionPriority;
  summary: string;
  specialty?: CounsellorSpecialty;
  preferredLanguage?: string;
  conversationId?: string;
}): Promise<CounsellingSession> {
  const { data: memberIdentity, error: memberIdentityError } = await db()
    .from("profiles")
    .select("email,display_name")
    .eq("id", params.userId)
    .maybeSingle();
  check(memberIdentityError);

  const { data: existing, error: existingError } = await db()
    .from("counselling_sessions")
    .select("*")
    .eq("user_id", params.userId)
    .in("state", ["requested", ...LIVE_STATES])
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  check(existingError);
  if (existing) {
    if (params.priority === "critical" && existing.priority !== "critical") {
      const { error } = await db()
        .from("counselling_sessions")
        .update({ priority: "critical", updated_at: nowIso() })
        .eq("id", existing.id);
      check(error);
      existing.priority = "critical";
    }
    return rowToSession(existing as Row);
  }

  const details: Json = {
    reason: params.reason,
    summary: sanitizeCounsellorSummary(params.summary, [
      memberIdentity?.email,
      memberIdentity?.display_name,
    ]),
    crisisEscalationLevel: 0,
  };
  if (params.specialty) details.specialty = params.specialty;
  if (params.preferredLanguage)
    details.preferredLanguage = params.preferredLanguage;
  if (params.conversationId) details.conversationId = params.conversationId;
  const { data, error } = await db()
    .from("counselling_sessions")
    .insert({
      user_id: params.userId,
      state: "requested",
      priority: params.priority,
      details,
    })
    .select("*")
    .single();
  check(error);
  if (!data) throw new Error("Session request was not created");
  await emitEvent("session.requested", {
    sessionId: data.id,
    userId: params.userId,
    priority: params.priority,
    reason: params.reason,
  });
  await attemptMatch(data.id);
  return (await getSession(data.id)) || rowToSession(data as Row);
}

export async function acceptSession(
  sessionId: string,
  counsellorId: string,
): Promise<CounsellingSession> {
  const row = await fetchSession(sessionId);
  if (!row) throw new Error("Session not found");
  const session = rowToSession(row);
  await assertCounsellorOperationallyEligible(
    counsellorId,
    session.priority,
    sessionId,
  );
  const { data: staff, error: staffError } = await db()
    .from("counsellors")
    .select("status,last_heartbeat")
    .eq("id", counsellorId)
    .maybeSingle();
  check(staffError);
  const fresh =
    staff?.last_heartbeat &&
    new Date(staff.last_heartbeat).getTime() >=
      Date.now() - PRESENCE_TTL_SECONDS * 1000;
  if (!fresh || !["available", "in_session"].includes(staff?.status)) {
    throw new Error("Counsellor must be signed in to accept a session");
  }
  if (session.state === "requested" && session.priority === "critical") {
    assertTransition("requested", "matched");
    assertTransition("matched", "accepted");
  } else {
    if (session.counsellorId !== counsellorId) {
      throw new Error("Session is not assigned to this counsellor");
    }
    assertTransition(session.state, "accepted");
  }
  assertTransition("accepted", "active");
  const acceptedAt = new Date();
  const timeToHumanSeconds = Math.max(
    0,
    Math.round(
      (acceptedAt.getTime() - session.requestedAt.getTime()) / 1000,
    ),
  );
  const { data, error } = await db()
    .from("counselling_sessions")
    .update({
      state: "active",
      counsellor_id: counsellorId,
      matched_at: session.matchedAt?.toISOString() || acceptedAt.toISOString(),
      accepted_at: acceptedAt.toISOString(),
      active_at: acceptedAt.toISOString(),
      time_to_human_seconds: timeToHumanSeconds,
      updated_at: acceptedAt.toISOString(),
    })
    .eq("id", sessionId)
    .eq("state", session.state)
    .select("*")
    .maybeSingle();
  check(error);
  if (!data) throw new Error("Session changed before it could be accepted");
  await setCounsellorInSession(counsellorId);
  await emitEvent("session.accepted", {
    sessionId,
    counsellorId,
    priority: session.priority,
    timeToHumanSeconds,
  });
  await emitEvent("session.activated", { sessionId });
  return rowToSession(data as Row);
}

export async function declineSession(
  sessionId: string,
  counsellorId: string,
): Promise<void> {
  const row = await fetchSession(sessionId);
  if (!row) throw new Error("Session not found");
  const session = rowToSession(row);
  if (session.counsellorId !== counsellorId) {
    throw new Error("Session is not assigned to this counsellor");
  }
  assertTransition(session.state, "requested");
  const details = detailsOf(row);
  delete details.counsellorName;
  const { error } = await db()
    .from("counselling_sessions")
    .update({
      state: "requested",
      counsellor_id: null,
      matched_at: null,
      declined_by: [...new Set([...session.declinedBy, counsellorId])],
      details,
      updated_at: nowIso(),
    })
    .eq("id", sessionId)
    .eq("counsellor_id", counsellorId);
  check(error);
  await emitEvent("session.declined", { sessionId, counsellorId });
  await refreshCounsellorAvailability(counsellorId);
  await attemptMatch(sessionId);
}

export async function endSession(
  sessionId: string,
  byUid: string,
): Promise<void> {
  const row = await fetchSession(sessionId);
  if (!row) throw new Error("Session not found");
  const session = rowToSession(row);
  if (byUid !== session.userId && byUid !== session.counsellorId) {
    throw new Error("Not a participant of this session");
  }
  assertTransition(session.state, "completed");
  const details = {
    ...detailsOf(row),
    endedBy: byUid === session.userId ? "user" : "counsellor",
  };
  const { error } = await db()
    .from("counselling_sessions")
    .update({
      state: "completed",
      completed_at: nowIso(),
      details,
      updated_at: nowIso(),
    })
    .eq("id", sessionId)
    .eq("state", session.state);
  check(error);
  await emitEvent("session.completed", {
    sessionId,
    counsellorId: session.counsellorId,
    userId: session.userId,
    endedBy: details.endedBy,
  });
  if (session.counsellorId)
    await refreshCounsellorAvailability(session.counsellorId);
}

export async function escalateSession(
  sessionId: string,
  counsellorId: string,
): Promise<void> {
  const row = await fetchSession(sessionId);
  if (!row) throw new Error("Session not found");
  const session = rowToSession(row);
  if (session.counsellorId !== counsellorId) {
    throw new Error("Session is not assigned to this counsellor");
  }
  assertTransition(session.state, "escalated");
  const { error } = await db()
    .from("counselling_sessions")
    .update({
      state: "escalated",
      completed_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq("id", sessionId)
    .eq("state", session.state);
  check(error);
  await emitEvent("session.escalated", {
    sessionId,
    counsellorId,
    userId: session.userId,
  });
  await refreshCounsellorAvailability(counsellorId);
}

export async function submitFeedback(
  sessionId: string,
  userUid: string,
  rating: number,
  comment?: string,
): Promise<void> {
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }
  const row = await fetchSession(sessionId);
  if (!row) throw new Error("Session not found");
  const session = rowToSession(row);
  if (session.userId !== userUid) {
    throw new Error("Only the session's user can leave feedback");
  }
  assertTransition(session.state, "feedback_received");
  const details = {
    ...detailsOf(row),
    feedbackRating: rating,
    ...(comment ? { feedbackComment: comment.slice(0, 1000) } : {}),
  };
  const { error } = await db()
    .from("counselling_sessions")
    .update({ state: "feedback_received", details, updated_at: nowIso() })
    .eq("id", sessionId)
    .eq("state", session.state);
  check(error);
  await emitEvent("feedback.received", {
    sessionId,
    counsellorId: session.counsellorId,
    rating,
    comment: comment?.slice(0, 1000),
  });
}

export async function getSession(
  sessionId: string,
): Promise<CounsellingSession | null> {
  const row = await fetchSession(sessionId);
  return row ? rowToSession(row) : null;
}

export async function listSessionsForUser(
  uid: string,
): Promise<CounsellingSession[]> {
  const { data, error } = await db()
    .from("counselling_sessions")
    .select("*")
    .eq("user_id", uid)
    .order("requested_at", { ascending: false });
  check(error);
  return (data || []).map((item) => rowToSession(item as Row));
}

export async function listSessionsForCounsellor(uid: string): Promise<{
  assigned: CounsellingSession[];
  openCritical: CounsellingSession[];
}> {
  const [{ data: assigned, error }, { data: critical, error: criticalError }] =
    await Promise.all([
      db()
        .from("counselling_sessions")
        .select("*")
        .eq("counsellor_id", uid)
        .order("requested_at", { ascending: false }),
      db()
        .from("counselling_sessions")
        .select("*")
        .eq("state", "requested")
        .eq("priority", "critical")
        .order("requested_at", { ascending: true }),
    ]);
  check(error);
  check(criticalError);
  return {
    assigned: (assigned || []).map((item) => rowToSession(item as Row)),
    openCritical: (critical || [])
      .map((item) => rowToSession(item as Row))
      .filter((session) => !session.declinedBy.includes(uid))
      .sort(compareQueuePriority),
  };
}

export async function sweepSessions(): Promise<{
  rematched: number;
  expired: number;
  drained: number;
  crisisEscalations: number;
}> {
  const { data, error } = await db()
    .from("counselling_sessions")
    .select("*")
    .in("state", ["requested", "matched"]);
  check(error);
  const currentTime = new Date();
  let rematched = 0;
  let expired = 0;
  let crisisEscalations = 0;

  for (const raw of data || []) {
    const row = raw as Row;
    const session = rowToSession(row);
    if (session.priority === "critical" && session.state === "requested") {
      const escalation = evaluateCrisisEscalation(
        session.requestedAt,
        session.crisisEscalationLevel || 0,
        currentTime,
      );
      if (escalation.action !== "none") {
        const waitingSeconds = Math.max(
          0,
          Math.round(
            (currentTime.getTime() - session.requestedAt.getTime()) / 1000,
          ),
        );
        const details = {
          ...detailsOf(row),
          crisisEscalationLevel: escalation.level,
          lastCrisisEscalationAt: currentTime.toISOString(),
          ...(escalation.action === "show_emergency_fallback"
            ? { emergencyFallbackRequired: true }
            : {}),
          ...(escalation.action === "open_incident"
            ? { incidentRequired: true }
            : {}),
        };
        const { error: updateError } = await db()
          .from("counselling_sessions")
          .update({ details, updated_at: nowIso() })
          .eq("id", session.id);
        check(updateError);
        await emitEvent("crisis.escalation_triggered", {
          sessionId: session.id,
          level: escalation.level,
          action: escalation.action,
          waitingSeconds,
        });
        if (escalation.action === "open_incident") {
          await openCrisisIncident({
            sessionId: session.id,
            waitingSeconds,
          });
        }
        crisisEscalations += 1;
      }
    }
    const action = evaluateTimeout(session, currentTime);
    if (action === "rematch" && session.counsellorId) {
      const details = detailsOf(row);
      delete details.counsellorName;
      const { error: updateError } = await db()
        .from("counselling_sessions")
        .update({
          state: "requested",
          counsellor_id: null,
          matched_at: null,
          declined_by: [
            ...new Set([...session.declinedBy, session.counsellorId]),
          ],
          details,
          updated_at: nowIso(),
        })
        .eq("id", session.id)
        .eq("state", "matched");
      check(updateError);
      await refreshCounsellorAvailability(session.counsellorId);
      await emitEvent("session.rematch_timeout", {
        sessionId: session.id,
        timedOutCounsellorId: session.counsellorId,
      });
      rematched += 1;
    } else if (action === "expire") {
      const { error: updateError } = await db()
        .from("counselling_sessions")
        .update({
          state: "expired",
          completed_at: nowIso(),
          updated_at: nowIso(),
        })
        .eq("id", session.id)
        .eq("state", session.state);
      check(updateError);
      await emitEvent("session.expired", {
        sessionId: session.id,
        userId: session.userId,
      });
      expired += 1;
    }
  }
  const { matched } = await drainQueue();
  return {
    rematched,
    expired,
    drained: matched,
    crisisEscalations,
  };
}

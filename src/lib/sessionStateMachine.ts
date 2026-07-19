/**
 * Session state machine — pure transition rules and timeout policy for
 * counselling sessions (ARCHITECTURE_V2 §4.4). No I/O: the server engine
 * (src/lib/server/sessions.ts) enforces these rules against Firestore, and
 * this module is unit-tested in isolation.
 *
 *   requested → matched | expired
 *   matched   → accepted | requested   (decline / accept-timeout → rematch)
 *   accepted  → active
 *   active    → completed | escalated
 *   completed → feedback_received
 */

import { CounsellingSession, SessionState } from "@/types";

export const SESSION_TRANSITIONS: Record<SessionState, SessionState[]> = {
  requested: ["matched", "expired"],
  matched: ["accepted", "requested"],
  accepted: ["active"],
  active: ["completed", "escalated"],
  completed: ["feedback_received"],
  feedback_received: [],
  expired: [],
  escalated: [],
};

export const TERMINAL_STATES: SessionState[] = [
  "feedback_received",
  "expired",
  "escalated",
];

/** A matched session the counsellor hasn't accepted within this window is
 * returned to the queue and rematched (the counsellor is excluded). */
export const ACCEPT_TIMEOUT_MINUTES = 10;

/** A normal request unmatched for this long expires with fallback resources.
 * Critical requests never expire — they wait for a human. */
export const REQUEST_EXPIRY_HOURS = 24;

export function canTransition(from: SessionState, to: SessionState): boolean {
  return SESSION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: SessionState, to: SessionState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid session transition: ${from} → ${to}`);
  }
}

export type TimeoutAction = "none" | "rematch" | "expire";

/**
 * Decide what the sweeper should do with a session right now.
 * Pure — the caller supplies the clock.
 */
export function evaluateTimeout(
  session: Pick<
    CounsellingSession,
    "state" | "priority" | "requestedAt" | "matchedAt"
  >,
  now: Date = new Date(),
): TimeoutAction {
  if (session.state === "matched" && session.matchedAt) {
    const ageMs = now.getTime() - session.matchedAt.getTime();
    if (ageMs > ACCEPT_TIMEOUT_MINUTES * 60_000) return "rematch";
    return "none";
  }

  if (session.state === "requested") {
    if (session.priority === "critical") return "none"; // never expire a crisis
    const ageMs = now.getTime() - session.requestedAt.getTime();
    if (ageMs > REQUEST_EXPIRY_HOURS * 3_600_000) return "expire";
  }

  return "none";
}

/**
 * Queue ordering: critical first, then oldest first. Used when draining the
 * queue as counsellors come online.
 */
export function compareQueuePriority(
  a: Pick<CounsellingSession, "priority" | "requestedAt">,
  b: Pick<CounsellingSession, "priority" | "requestedAt">,
): number {
  if (a.priority !== b.priority) {
    return a.priority === "critical" ? -1 : 1;
  }
  return a.requestedAt.getTime() - b.requestedAt.getTime();
}

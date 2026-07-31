/**
 * Client-side helpers for the sessions feature — auth-token-carrying API
 * calls and shared display metadata. Browser code only.
 */

import { authenticatedFetch } from "@/lib/authenticatedFetch";
import { CounsellingSession, SessionState } from "@/types";

export interface SessionApiError extends Error {
  status?: number;
}

async function sessionsFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const res = await authenticatedFetch(path, {
    ...init,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const error: SessionApiError = new Error(
      data.error || `Request failed (${res.status})`,
    );
    error.status = res.status;
    throw error;
  }
  return data.data as T;
}

/** Convert API date fields (ISO strings after JSON) back to Date objects. */
export function reviveSession(raw: CounsellingSession): CounsellingSession {
  const dateField = (v: unknown) => (v ? new Date(v as string) : undefined);
  return {
    ...raw,
    requestedAt: dateField(raw.requestedAt) || new Date(),
    matchedAt: dateField(raw.matchedAt),
    acceptedAt: dateField(raw.acceptedAt),
    activeAt: dateField(raw.activeAt),
    completedAt: dateField(raw.completedAt),
  };
}

export async function listMySessions(): Promise<CounsellingSession[]> {
  const data = await sessionsFetch<{ sessions: CounsellingSession[] }>(
    "/api/sessions",
  );
  return data.sessions.map(reviveSession);
}

export async function listCounsellorSessions(): Promise<{
  assigned: CounsellingSession[];
  openCritical: CounsellingSession[];
}> {
  const data = await sessionsFetch<{
    assigned: CounsellingSession[];
    openCritical: CounsellingSession[];
  }>("/api/sessions");
  return {
    assigned: data.assigned.map(reviveSession),
    openCritical: data.openCritical.map(reviveSession),
  };
}

export async function requestSession(params?: {
  summary?: string;
  shareSummary?: boolean;
  specialty?: string;
  preferredLanguage?: string;
}): Promise<CounsellingSession> {
  const data = await sessionsFetch<{ session: CounsellingSession }>(
    "/api/sessions",
    { method: "POST", body: JSON.stringify(params || {}) },
  );
  return reviveSession(data.session);
}

export async function getSessionDetail(
  id: string,
): Promise<CounsellingSession> {
  const data = await sessionsFetch<{ session: CounsellingSession }>(
    `/api/sessions/${id}`,
  );
  return reviveSession(data.session);
}

export async function transitionSession(
  id: string,
  action: "accept" | "decline" | "end" | "escalate" | "feedback",
  extra?: { rating?: number; comment?: string },
): Promise<void> {
  await sessionsFetch(`/api/sessions/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ action, ...(extra || {}) }),
  });
}

export async function sendPresence(
  status: "available" | "offline",
): Promise<"available" | "in_session" | "offline"> {
  const data = await sessionsFetch<{ status?: "available" | "in_session" | "offline" }>("/api/presence", {
    method: "POST",
    body: JSON.stringify({ status }),
  });
  return data.status || status;
}

/** Display metadata per state, shared by the list, room, and portal UIs. */
export const SESSION_STATE_META: Record<
  SessionState,
  { label: string; badgeClass: string; description: string }
> = {
  requested: {
    label: "Finding counsellor",
    badgeClass:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    description: "We're finding the right counsellor for you.",
  },
  matched: {
    label: "Counsellor found",
    badgeClass:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    description: "Waiting for the counsellor to accept.",
  },
  accepted: {
    label: "Starting…",
    badgeClass:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    description: "Your session is starting.",
  },
  active: {
    label: "Active",
    badgeClass:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    description: "Your session is live — open the room to chat.",
  },
  completed: {
    label: "Completed",
    badgeClass:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    description: "Session ended. You can leave feedback.",
  },
  feedback_received: {
    label: "Rated",
    badgeClass:
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    description: "Thanks for your feedback.",
  },
  expired: {
    label: "Expired",
    badgeClass:
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    description: "No counsellor was available in time. Please try again.",
  },
  escalated: {
    label: "Escalated",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    description: "This session was escalated to emergency support.",
  },
};

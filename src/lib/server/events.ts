/**
 * Event log — SERVER ONLY. The append-only backbone from ARCHITECTURE_V2 §4.3.
 *
 * Every domain fact is recorded here as an immutable, past-tense event.
 * Consumers (reputation, SLA dashboards, analytics) read this log instead of
 * maintaining their own truths. Emission never throws: losing one telemetry
 * event must never break the user-facing action that produced it.
 *
 * Event doc shape: { type, payload, createdAt }
 */

import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";

export type DomainEventType =
  | "session.requested"
  | "session.matched"
  | "session.accepted"
  | "session.declined"
  | "session.activated"
  | "session.completed"
  | "session.expired"
  | "session.escalated"
  | "session.rematch_timeout"
  | "feedback.received"
  | "crisis.detected"
  | "counsellor.presence_changed";

export async function emitEvent(
  type: DomainEventType,
  payload: Record<string, unknown>,
): Promise<void> {
  const db = getAdminDb();
  if (!db) {
    // Unconfigured dev mode — keep the signal visible in logs at least.
    console.log(`[event:${type}]`, JSON.stringify(payload));
    return;
  }

  try {
    await db.collection("events").add({
      type,
      payload,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.warn(`[events] Failed to emit ${type}:`, error);
  }
}

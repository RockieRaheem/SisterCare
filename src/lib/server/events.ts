/** Append-only Supabase domain-event log. Emission never breaks user actions. */
import { getSupabaseAdmin } from "../supabaseAdmin";

export type DomainEventType =
  | "session.requested"
  | "session.matched"
  | "session.accepted"
  | "session.declined"
  | "session.activated"
  | "session.completed"
  | "session.expired"
  | "session.escalated"
  | "session.cancelled"
  | "session.rematch_timeout"
  | "feedback.received"
  | "crisis.detected"
  | "crisis.escalation_triggered"
  | "counsellor.presence_changed"
  | "agent.tool_executed";

export async function emitEvent(
  type: DomainEventType,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const subject =
      typeof payload.sessionId === "string" &&
      /^[0-9a-f-]{36}$/i.test(payload.sessionId)
        ? payload.sessionId
        : null;
    const { error } = await getSupabaseAdmin().from("audit_events").insert({
      event_type: type,
      subject_id: subject,
      metadata: payload,
    });
    if (error) throw error;
  } catch (error) {
    console.warn(`[events] Failed to emit ${type}:`, error);
  }
}

import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { DOCTOR_PRESENCE_TTL_SECONDS } from "@/lib/server/doctorCare";
import { PRESENCE_TTL_SECONDS } from "@/lib/server/sessions";
import { emitEvent } from "@/lib/server/events";

export type CriticalSafetyCategory =
  | "self_harm"
  | "violence"
  | "immediate_danger"
  | "abuse"
  | "medical_red_flag"
  | "unsafe_procedure";

type RecipientRow = { id: string; last_heartbeat_at?: string | null };

function fresh(value: string | null | undefined, ttlSeconds: number, now: Date) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && now.getTime() - timestamp <= ttlSeconds * 1000;
}

/**
 * Opens an accountable admin incident and alerts every currently available
 * professional with only a category and link. The disclosure itself is never
 * copied into a broadcast notification.
 */
export async function notifyCriticalSafetyAlert(params: {
  category: CriticalSafetyCategory;
  sessionId?: string;
  includeDoctors?: boolean;
}): Promise<{ incidentId: string; recipients: number }> {
  const db = getSupabaseAdmin();
  const now = new Date();
  const incidentId = `safety-${randomUUID()}`;
  const { error: incidentError } = await db.from("incidents").insert({
    id: incidentId,
    type: params.category,
    severity: "critical",
    status: "open",
    session_id: params.sessionId || null,
    waiting_seconds_at_open: 0,
    updated_at: now.toISOString(),
  });
  if (incidentError) throw new Error(incidentError.message);

  const [adminsResult, counsellorsResult, doctorsResult] = await Promise.all([
    db.from("profiles").select("id").eq("role", "admin"),
    db
      .from("counsellors")
      .select("id,last_heartbeat_at")
      .eq("verification_status", "verified")
      .eq("status", "available")
      .eq("accepting_new_sessions", true),
    params.includeDoctors
      ? db
          .from("doctors")
          .select("id,last_heartbeat_at")
          .eq("verification_status", "verified")
          .eq("status", "available")
          .eq("accepting_appointments", true)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (adminsResult.error) throw new Error(adminsResult.error.message);
  if (counsellorsResult.error) throw new Error(counsellorsResult.error.message);
  if (doctorsResult.error) throw new Error(doctorsResult.error.message);

  const recipientTargets = new Map<string, string>();
  for (const row of (adminsResult.data || []) as RecipientRow[]) {
    recipientTargets.set(row.id, "/admin/incidents");
  }
  for (const row of (counsellorsResult.data || []) as RecipientRow[]) {
    if (fresh(row.last_heartbeat_at, PRESENCE_TTL_SECONDS, now)) {
      recipientTargets.set(
        row.id,
        params.sessionId ? `/sessions/${params.sessionId}` : "/counsellor",
      );
    }
  }
  for (const row of (doctorsResult.data || []) as RecipientRow[]) {
    if (fresh(row.last_heartbeat_at, DOCTOR_PRESENCE_TTL_SECONDS, now)) {
      recipientTargets.set(row.id, "/doctor");
    }
  }

  if (recipientTargets.size) {
    const { error } = await db.from("care_notifications").insert(
      [...recipientTargets].map(([recipientId, href]) => ({
        recipient_id: recipientId,
        session_id: params.sessionId || null,
        event_type: "safety_alert",
        event_key: `safety:${incidentId}:${recipientId}`,
        metadata: {
          severity: "critical",
          category: params.category,
          href,
        },
      })),
    );
    if (error) throw new Error(error.message);
  }

  await emitEvent("crisis.escalation_triggered", {
    sessionId: params.sessionId,
    incidentId,
    category: params.category,
    recipients: recipientTargets.size,
  });
  return { incidentId, recipients: recipientTargets.size };
}

/**
 * Records a blocked AI medical instruction as an accountable safety incident.
 * Only administrators are notified and no conversation text is copied into
 * either the incident or notification.
 */
export async function notifyMedicalSafetyBlock(params: {
  conversationId?: string;
  stage: "model_output" | "localized_output";
  violations: string[];
}): Promise<{ incidentId: string; recipients: number }> {
  const db = getSupabaseAdmin();
  const incidentId = `medical-ai-${randomUUID()}`;
  const now = new Date().toISOString();
  const { error: incidentError } = await db.from("incidents").insert({
    id: incidentId,
    type: "ai_medical_output_blocked",
    severity: "high",
    status: "open",
    session_id: null,
    waiting_seconds_at_open: 0,
    updated_at: now,
  });
  if (incidentError) throw new Error(incidentError.message);

  const { data: admins, error: adminError } = await db
    .from("profiles")
    .select("id")
    .eq("role", "admin");
  if (adminError) throw new Error(adminError.message);
  const recipients = ((admins || []) as RecipientRow[]).map((row) => row.id);
  if (recipients.length) {
    const { error } = await db.from("care_notifications").insert(
      recipients.map((recipientId) => ({
        recipient_id: recipientId,
        event_type: "medical_safety_block",
        event_key: `medical-safety:${incidentId}:${recipientId}`,
        metadata: {
          severity: "high",
          incidentId,
          stage: params.stage,
          violationClasses: params.violations,
          href: "/admin/incidents",
        },
      })),
    );
    if (error) throw new Error(error.message);
  }
  await emitEvent("agent.medical_output_blocked", {
    incidentId,
    conversationId: params.conversationId,
    stage: params.stage,
    violations: params.violations,
    recipients: recipients.length,
  });
  return { incidentId, recipients: recipients.length };
}

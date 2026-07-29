import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  assertIncidentTransition,
  IncidentStatus,
} from "@/lib/incidents";

export async function openCrisisIncident(params: {
  sessionId: string;
  waitingSeconds: number;
}): Promise<void> {
  const { error } = await getSupabaseAdmin().from("incidents").upsert({
    id: `crisis-${params.sessionId}`,
    type: "crisis_sla_breach",
    severity: "critical",
    status: "open",
    session_id: params.sessionId,
    waiting_seconds_at_open: Math.max(0, Math.round(params.waitingSeconds)),
    updated_at: new Date().toISOString(),
  }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function transitionIncident(params: {
  incidentId: string;
  to: IncidentStatus;
  actorUid: string;
  resolutionNote?: string;
}): Promise<void> {
  const db = getSupabaseAdmin();
  const { data: incident, error: readError } = await db
    .from("incidents")
    .select("status")
    .eq("id", params.incidentId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!incident) throw new Error("Incident not found");
  const from = incident.status as IncidentStatus;
  assertIncidentTransition(from, params.to);
  const now = new Date().toISOString();
  const update = params.to === "acknowledged"
    ? {
        status: params.to,
        updated_at: now,
        acknowledged_at: now,
        acknowledged_by: params.actorUid,
      }
    : {
        status: params.to,
        updated_at: now,
        resolved_at: now,
        resolved_by: params.actorUid,
        resolution_note: (params.resolutionNote || "").slice(0, 1000),
      };
  const { data: changed, error } = await db
    .from("incidents")
    .update(update)
    .eq("id", params.incidentId)
    .eq("status", from)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!changed) {
    throw new Error("Incident changed before this update; refresh and retry");
  }
}

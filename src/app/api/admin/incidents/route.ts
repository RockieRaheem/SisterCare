import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole, isAuthEnforced } from "@/lib/serverAuth";
import { IncidentStatus } from "@/lib/incidents";
import { withApiObservability } from "@/lib/observability";
import { transitionIncident } from "@/lib/server/incidents";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

async function requireAdmin(request: NextRequest) {
  if (!isAuthEnforced()) return null;
  const auth = await authenticateRequest(request);
  return auth.status === "verified" && hasRole(auth, "admin") ? auth : null;
}

async function getIncidents(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ success: false, error: "Admin privileges required" }, { status: 403 });
  const { data, error } = await getSupabaseAdmin().from("incidents").select("*").order("opened_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 503 });
  const incidents = (data || []).map((row) => ({
    id: row.id,
    type: row.type,
    severity: row.severity,
    status: row.status,
    sessionId: row.session_id,
    waitingSecondsAtOpen: row.waiting_seconds_at_open,
    openedAt: row.opened_at,
    acknowledgedAt: row.acknowledged_at,
    resolvedAt: row.resolved_at,
    resolutionNote: row.resolution_note || "",
  }));
  return NextResponse.json({ success: true, data: { incidents } });
}

async function patchIncident(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ success: false, error: "Admin privileges required" }, { status: 403 });
  const body = await request.json().catch(() => null) as { incidentId?: string; to?: IncidentStatus; resolutionNote?: string } | null;
  if (!body?.incidentId || !body.to || !["acknowledged", "resolved"].includes(body.to)) {
    return NextResponse.json({ success: false, error: "Invalid incident transition" }, { status: 400 });
  }
  try {
    await transitionIncident({ incidentId: body.incidentId, to: body.to, actorUid: auth.uid, resolutionNote: body.resolutionNote });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ success: false, error: message }, { status: message.includes("not found") ? 404 : 409 });
  }
}

export const GET = withApiObservability("admin_incidents_get", getIncidents);
export const PATCH = withApiObservability("admin_incidents_patch", patchIncident);

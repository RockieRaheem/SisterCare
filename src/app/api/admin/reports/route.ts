import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAuthorizationFailure, isAuthEnforced } from "@/lib/serverAuth";
import { withApiObservability } from "@/lib/observability";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

async function requireAdmin(request: NextRequest) {
  if (!isAuthEnforced()) return { error: "Report operations are unavailable", status: 503 } as const;
  const auth = await authenticateRequest(request);
  const failure = getAuthorizationFailure(auth, "admin");
  if (failure) return { error: failure.error, status: failure.status } as const;
  if (auth.status !== "verified") return { error: "Authentication required", status: 401 } as const;
  return { auth } as const;
}

async function getReports(request: NextRequest) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("member_concern_reports")
    .select("id, reporter_id, target_type, target_id, category, description, status, assigned_to, resolution_note, created_at, updated_at, reviewed_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ success: false, error: "Concern reports could not be loaded." }, { status: 503 });
  return NextResponse.json({ success: true, data: { reports: data || [] } });
}

async function patchReport(request: NextRequest) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  const body = await request.json().catch(() => null) as { reportId?: unknown; status?: unknown; resolutionNote?: unknown } | null;
  const reportId = typeof body?.reportId === "string" ? body.reportId : "";
  const status = typeof body?.status === "string" ? body.status : "";
  const resolutionNote = typeof body?.resolutionNote === "string" ? body.resolutionNote.trim() : "";
  if (!reportId || !["reviewing", "resolved", "dismissed"].includes(status)) {
    return NextResponse.json({ success: false, error: "Invalid report transition" }, { status: 400 });
  }
  if (["resolved", "dismissed"].includes(status) && resolutionNote.length < 10) {
    return NextResponse.json({ success: false, error: "A closure note of at least 10 characters is required." }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  const patch = {
    status,
    assigned_to: admin.auth.uid,
    resolution_note: resolutionNote || null,
    reviewed_at: ["resolved", "dismissed"].includes(status) ? new Date().toISOString() : null,
  };
  const { data, error } = await db.from("member_concern_reports").update(patch).eq("id", reportId).select("id").maybeSingle();
  if (error) return NextResponse.json({ success: false, error: "The report could not be updated." }, { status: 503 });
  if (!data) return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
  await db.from("audit_events").insert({
    actor_id: admin.auth.uid,
    event_type: `member_report.${status}`,
    subject_id: reportId,
    metadata: { has_resolution_note: Boolean(resolutionNote) },
  });
  return NextResponse.json({ success: true });
}

export const GET = withApiObservability("admin_reports_get", getReports);
export const PATCH = withApiObservability("admin_reports_patch", patchReport);

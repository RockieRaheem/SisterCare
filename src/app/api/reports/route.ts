import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAuthorizationFailure, isAuthEnforced } from "@/lib/serverAuth";
import { withApiObservability } from "@/lib/observability";
import { consumeRateLimit } from "@/lib/server/rateLimit";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const TARGET_TYPES = new Set(["ai_response", "counsellor", "session", "message", "privacy", "technical", "other"]);
const CATEGORIES = new Set(["unsafe_advice", "harassment", "privacy", "incorrect_information", "access_problem", "other"]);

async function requireMember(request: NextRequest) {
  if (!isAuthEnforced()) return { error: "Reporting is temporarily unavailable", status: 503 } as const;
  const auth = await authenticateRequest(request);
  const failure = getAuthorizationFailure(auth);
  if (failure) return { error: failure.error, status: failure.status } as const;
  if (auth.status !== "verified" || auth.token.role !== "user") {
    return { error: "Member access required", status: 403 } as const;
  }
  return { auth } as const;
}

async function createReport(request: NextRequest) {
  const member = await requireMember(request);
  if ("error" in member) return NextResponse.json({ success: false, error: member.error }, { status: member.status });

  const body = await request.json().catch(() => null) as {
    targetType?: unknown;
    targetId?: unknown;
    category?: unknown;
    description?: unknown;
  } | null;
  const targetType = typeof body?.targetType === "string" ? body.targetType : "";
  const category = typeof body?.category === "string" ? body.category : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const targetId = typeof body?.targetId === "string" ? body.targetId.trim().slice(0, 160) : null;
  if (!TARGET_TYPES.has(targetType) || !CATEGORIES.has(category) || description.length < 10 || description.length > 2000) {
    return NextResponse.json({ success: false, error: "Choose a report type and provide 10–2000 characters of detail." }, { status: 400 });
  }

  const quota = await consumeRateLimit("member-report", member.auth.uid, 5, 60 * 60 * 1000);
  if (!quota.allowed) {
    return NextResponse.json(
      { success: false, error: "You have submitted several reports recently. Please try again later." },
      { status: 429, headers: { "Retry-After": String(quota.retryAfterSeconds) } },
    );
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db.from("member_concern_reports").insert({
    reporter_id: member.auth.uid,
    target_type: targetType,
    target_id: targetId || null,
    category,
    description,
  }).select("id, status, created_at").single();
  if (error) {
    console.error("Member report submission failed:", error);
    return NextResponse.json({ success: false, error: "Your report could not be submitted. Please try again." }, { status: 503 });
  }
  await db.from("audit_events").insert({
    actor_id: member.auth.uid,
    event_type: "member.concern_reported",
    subject_id: data.id,
    metadata: { target_type: targetType, category },
  });
  return NextResponse.json({ success: true, data: { report: { id: data.id, status: data.status, createdAt: data.created_at } } }, { status: 201 });
}

async function listOwnReports(request: NextRequest) {
  const member = await requireMember(request);
  if ("error" in member) return NextResponse.json({ success: false, error: member.error }, { status: member.status });
  const { data, error } = await getSupabaseAdmin()
    .from("member_concern_reports")
    .select("id, target_type, category, status, created_at, reviewed_at")
    .eq("reporter_id", member.auth.uid)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ success: false, error: "Reports could not be loaded." }, { status: 503 });
  return NextResponse.json({ success: true, data: { reports: data || [] } });
}

export const POST = withApiObservability("member_report_create", createReport);
export const GET = withApiObservability("member_reports_get", listOwnReports);

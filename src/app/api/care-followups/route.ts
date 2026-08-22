import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authorizeCounsellor, getAuthorizationFailure, isAuthEnforced } from "@/lib/serverAuth";
import { createSessionRequest } from "@/lib/server/sessions";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

async function requireCounsellor(request: NextRequest) {
  if (!isAuthEnforced()) return { error: "Care follow-up is unavailable", status: 503 } as const;
  const auth = await authenticateRequest(request);
  const failure = getAuthorizationFailure(auth);
  if (failure || auth.status !== "verified") return { error: failure?.error || "Authentication required", status: failure?.status || 401 } as const;
  const access = await authorizeCounsellor(auth);
  if (access.status !== "authorized") return { error: "Verified counsellor access required", status: access.status === "unavailable" ? 503 : 403 } as const;
  return { auth } as const;
}

export async function GET(request: NextRequest) {
  const counsellor = await requireCounsellor(request);
  if ("error" in counsellor) return NextResponse.json({ success: false, error: counsellor.error }, { status: counsellor.status });
  const { data, error } = await getSupabaseAdmin()
    .from("care_followups")
    .select("id,source_session_id,member_id,reason,status,due_at,linked_session_id,created_at")
    .eq("assigned_counsellor_id", counsellor.auth.uid)
    .in("status", ["pending", "contacted"])
    .order("due_at", { ascending: true });
  if (error) return NextResponse.json({ success: false, error: "Follow-up work could not be loaded" }, { status: 503 });
  return NextResponse.json({ success: true, data: { followUps: data || [] } }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: NextRequest) {
  const counsellor = await requireCounsellor(request);
  if ("error" in counsellor) return NextResponse.json({ success: false, error: counsellor.error }, { status: counsellor.status });
  const body = await request.json().catch(() => null) as { id?: unknown; action?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const action = typeof body?.action === "string" ? body.action : "";
  if (!id || !["start", "complete"].includes(action)) return NextResponse.json({ success: false, error: "Invalid follow-up action" }, { status: 400 });
  const db = getSupabaseAdmin();
  const { data: followUp, error } = await db.from("care_followups").select("*").eq("id", id).eq("assigned_counsellor_id", counsellor.auth.uid).maybeSingle();
  if (error) return NextResponse.json({ success: false, error: "Follow-up could not be checked" }, { status: 503 });
  if (!followUp) return NextResponse.json({ success: false, error: "Assigned follow-up not found" }, { status: 404 });
  if (action === "complete") {
    if (followUp.status !== "contacted") return NextResponse.json({ success: false, error: "Start the follow-up before completing it" }, { status: 409 });
    const { error: completeError } = await db.from("care_followups").update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("status", "contacted");
    if (completeError) return NextResponse.json({ success: false, error: "Follow-up could not be completed" }, { status: 503 });
    return NextResponse.json({ success: true, data: { status: "completed" } });
  }
  if (followUp.status === "contacted" && followUp.linked_session_id) return NextResponse.json({ success: true, data: { status: "contacted", sessionId: followUp.linked_session_id } });
  const session = await createSessionRequest({
    userId: followUp.member_id,
    reason: "user_request",
    priority: "normal",
    summary: "Member requested a private follow-up after a previous care session without sharing additional context.",
    preferredCounsellorId: counsellor.auth.uid,
    explicitSummaryConsent: false,
  });
  const now = new Date().toISOString();
  const { error: updateError } = await db.from("care_followups").update({ status: "contacted", contacted_at: now, linked_session_id: session.id, updated_at: now }).eq("id", id).eq("status", "pending");
  if (updateError) return NextResponse.json({ success: false, error: "The follow-up room opened but its work item could not be updated" }, { status: 503 });
  await db.from("care_notifications").upsert({
    recipient_id: followUp.member_id,
    session_id: session.id,
    event_type: "follow_up_started",
    event_key: `follow-up:${id}:started`,
  }, { onConflict: "event_key", ignoreDuplicates: true });
  return NextResponse.json({ success: true, data: { status: "contacted", sessionId: session.id } });
}

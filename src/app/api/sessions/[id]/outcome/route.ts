import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAuthorizationFailure, isAuthEnforced } from "@/lib/serverAuth";
import { recordOperationalMetric } from "@/lib/observability";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const HEARD = new Set(["yes", "partly", "no", "prefer_not"]);
const NEXT_STEP = new Set(["clear", "follow_up", "referral", "prefer_not"]);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Care outcomes are unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  const failure = getAuthorizationFailure(auth);
  if (failure || auth.status !== "verified") return NextResponse.json({ success: false, error: failure?.error || "Authentication required" }, { status: failure?.status || 401 });
  const { id } = await params;
  const db = getSupabaseAdmin();
  const { data: session } = await db.from("counselling_sessions").select("user_id,counsellor_id").eq("id", id).maybeSingle();
  if (!session || session.user_id !== auth.uid) return NextResponse.json({ success: false, error: "Member session access required" }, { status: 403 });
  const { data, error } = await db.from("care_outcomes").select("felt_heard,next_step,follow_up_requested,submitted_at").eq("session_id", id).maybeSingle();
  if (error) return NextResponse.json({ success: false, error: "Care outcome could not be loaded" }, { status: 503 });
  return NextResponse.json({ success: true, data: { outcome: data || null } }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Care outcomes are unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  const failure = getAuthorizationFailure(auth);
  if (failure || auth.status !== "verified") return NextResponse.json({ success: false, error: failure?.error || "Authentication required" }, { status: failure?.status || 401 });
  const body = await request.json().catch(() => null) as { feltHeard?: unknown; nextStep?: unknown } | null;
  const feltHeard = typeof body?.feltHeard === "string" ? body.feltHeard : "";
  const nextStep = typeof body?.nextStep === "string" ? body.nextStep : "";
  if (!HEARD.has(feltHeard) || !NEXT_STEP.has(nextStep)) return NextResponse.json({ success: false, error: "Choose both care outcome responses" }, { status: 400 });
  const { id } = await params;
  const db = getSupabaseAdmin();
  const { data: session, error: sessionError } = await db.from("counselling_sessions").select("id,user_id,counsellor_id,state").eq("id", id).maybeSingle();
  if (sessionError) return NextResponse.json({ success: false, error: "Session could not be checked" }, { status: 503 });
  if (!session || session.user_id !== auth.uid) return NextResponse.json({ success: false, error: "Member session access required" }, { status: 403 });
  if (!["completed", "feedback_received", "escalated"].includes(session.state)) return NextResponse.json({ success: false, error: "The session must end before recording an outcome" }, { status: 409 });
  const followUpRequested = nextStep === "follow_up" || nextStep === "referral";
  const { error } = await db.from("care_outcomes").upsert({
    session_id: id,
    member_id: auth.uid,
    felt_heard: feltHeard,
    next_step: nextStep,
    follow_up_requested: followUpRequested,
    updated_at: new Date().toISOString(),
  }, { onConflict: "session_id" });
  if (error) return NextResponse.json({ success: false, error: "Care outcome could not be saved" }, { status: 503 });
  if (followUpRequested) {
    const { error: followUpError } = await db.from("care_followups").upsert({
      source_session_id: id,
      member_id: auth.uid,
      assigned_counsellor_id: session.counsellor_id,
      reason: nextStep === "referral" ? "referral" : "member_requested",
      status: "pending",
      due_at: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "source_session_id" });
    if (followUpError) return NextResponse.json({ success: false, error: "Your outcome was saved, but follow-up could not be assigned" }, { status: 503 });
    if (session.counsellor_id) await db.from("care_notifications").upsert({
      recipient_id: session.counsellor_id,
      session_id: id,
      event_type: "follow_up_requested",
      event_key: `follow-up:${id}:requested`,
    }, { onConflict: "event_key", ignoreDuplicates: true });
  }
  void recordOperationalMetric("care_outcomes_submitted");
  void recordOperationalMetric(`care_felt_heard_${feltHeard}`);
  if (followUpRequested) void recordOperationalMetric("care_followups_requested");
  return NextResponse.json({ success: true, data: { followUpRequested } });
}

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAuthorizationFailure, isAuthEnforced } from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const VERIFICATION_STATES = ["pending", "verified", "suspended", "expired"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Counsellor operations are unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  const authorizationFailure = getAuthorizationFailure(auth, "admin");
  if (authorizationFailure) return NextResponse.json({ success: false, error: authorizationFailure.error }, { status: authorizationFailure.status });
  if (auth.status !== "verified") return NextResponse.json({ success: false, error: "Authentication verification is temporarily unavailable. Please retry." }, { status: 503 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
  const verificationStatus = String(body.verificationStatus || "");
  if (!VERIFICATION_STATES.includes(verificationStatus as (typeof VERIFICATION_STATES)[number])) {
    return NextResponse.json({ success: false, error: "Invalid verification status" }, { status: 400 });
  }
  const maxConcurrentSessions = Number(body.maxConcurrentSessions);
  if (!Number.isInteger(maxConcurrentSessions) || maxConcurrentSessions < 1 || maxConcurrentSessions > 10) {
    return NextResponse.json({ success: false, error: "Capacity must be between 1 and 10" }, { status: 400 });
  }
  const credentialExpiresAt = new Date(String(body.credentialExpiresAt || ""));
  if (Number.isNaN(credentialExpiresAt.getTime())) {
    return NextResponse.json({ success: false, error: "A valid credential expiry is required" }, { status: 400 });
  }
  const availableHours = body.availableHours as { start?: unknown; end?: unknown; days?: unknown } | undefined;
  const validTime = (value: unknown) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (!availableHours || !validTime(availableHours.start) || !validTime(availableHours.end) || !Array.isArray(availableHours.days) || !availableHours.days.length || !availableHours.days.every((day) => typeof day === "string")) {
    return NextResponse.json({ success: false, error: "A valid shift schedule is required" }, { status: 400 });
  }
  const { id } = await params;
  const db = getSupabaseAdmin();
  const { data: existing, error: readError } = await db.from("counsellors").select("profile").eq("id", id).maybeSingle();
  if (readError) return NextResponse.json({ success: false, error: readError.message }, { status: 503 });
  if (!existing) return NextResponse.json({ success: false, error: "Counsellor not found" }, { status: 404 });
  const profile = {
    ...((existing.profile as Record<string, unknown>) || {}),
    credentialExpiresAt: credentialExpiresAt.toISOString(),
    crisisTrained: body.crisisTrained === true,
    supervisorId: typeof body.supervisorId === "string" ? body.supervisorId.trim() : "",
    availableHours: {
      start: availableHours.start,
      end: availableHours.end,
      days: availableHours.days,
    },
  };
  const update = await db.from("counsellors").update({
    profile,
    verification_status: verificationStatus,
    max_concurrent_sessions: maxConcurrentSessions,
    accepting_new_sessions: verificationStatus === "verified" && body.acceptingNewSessions === true,
    ...(verificationStatus === "verified" ? {} : { status: "offline" }),
  }).eq("id", id);
  if (update.error) return NextResponse.json({ success: false, error: update.error.message }, { status: 503 });
  await db.from("audit_events").insert({
    actor_id: auth.uid,
    event_type: "counsellor.verification_changed",
    subject_id: id,
    metadata: { verificationStatus },
  });
  return NextResponse.json({ success: true });
}

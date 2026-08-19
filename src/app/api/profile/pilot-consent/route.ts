import { NextRequest, NextResponse } from "next/server";
import { CONTROLLED_PILOT } from "@/lib/pilot";
import { getSupabaseAdmin, verifySupabaseAccessToken } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  const match = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    adultConfirmed?: unknown;
    consentVersion?: unknown;
  } | null;
  if (
    body?.adultConfirmed !== true ||
    body.consentVersion !== CONTROLLED_PILOT.consentVersion
  ) {
    return NextResponse.json({ error: "Valid pilot consent is required" }, { status: 400 });
  }

  try {
    const { user, error } = await verifySupabaseAccessToken(match[1]);
    if (error || !user) {
      return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
    }

    const db = getSupabaseAdmin();
    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("role, registration_intent")
      .eq("id", user.id)
      .single();
    if (profileError) throw profileError;
    if (profile.role !== "member" || profile.registration_intent === "counsellor") {
      return NextResponse.json({ error: "Pilot member consent is not applicable to this workspace" }, { status: 403 });
    }

    const acceptedAt = new Date().toISOString();
    const { error: updateError } = await db
      .from("profiles")
      .update({
        adult_confirmed: true,
        pilot_consent_version: CONTROLLED_PILOT.consentVersion,
        pilot_consent_at: acceptedAt,
      })
      .eq("id", user.id);
    if (updateError) throw updateError;

    const { error: auditError } = await db.from("audit_events").insert({
      actor_id: user.id,
      event_type: "pilot.consent_recorded",
      subject_id: user.id,
      metadata: {
        version: CONTROLLED_PILOT.consentVersion,
        minimum_age: CONTROLLED_PILOT.minimumAge,
      },
    });
    if (auditError) {
      console.error("Pilot consent audit event could not be written:", auditError);
    }

    return NextResponse.json({ success: true, acceptedAt });
  } catch (error) {
    console.error("Pilot consent recording failed:", error);
    return NextResponse.json({ error: "Consent could not be recorded. Please try again." }, { status: 503 });
  }
}

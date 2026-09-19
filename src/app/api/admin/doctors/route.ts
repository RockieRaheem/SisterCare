import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getAuthorizationFailure,
  getUidByEmail,
  isAuthEnforced,
} from "@/lib/serverAuth";
import { validateDoctorVerification } from "@/lib/doctorVerification";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { withApiObservability } from "@/lib/observability";

async function admin(request: NextRequest) {
  if (!isAuthEnforced()) return null;
  const auth = await authenticateRequest(request);
  const failure = getAuthorizationFailure(auth, "admin");
  return failure || auth.status !== "verified" ? null : auth;
}

async function getDoctors(request: NextRequest) {
  const auth = await admin(request);
  if (!auth) return NextResponse.json({ success: false, error: "Administrator access required" }, { status: 401 });
  const { data, error } = await getSupabaseAdmin()
    .from("doctors")
    // doctors has two profile FKs (id and verified_by); disambiguate the
    // professional account so PostgREST does not reject the embed.
    .select("id,professional_name,title,specializations,languages,registration_number,licensing_body,credential_expires_at,verification_status,status,accepting_appointments,last_heartbeat_at,verified_at,profiles:profiles!doctors_id_fkey(email)")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("Doctor directory query failed:", error.code, error.message);
    return NextResponse.json({ success: false, error: "Doctor records could not be loaded" }, { status: 503 });
  }
  return NextResponse.json({ success: true, data: { doctors: data || [] } }, { headers: { "Cache-Control": "private, no-store" } });
}

async function verifyDoctor(request: NextRequest) {
  const auth = await admin(request);
  if (!auth) return NextResponse.json({ success: false, error: "Administrator access required" }, { status: 401 });
  const validation = validateDoctorVerification(await request.json().catch(() => ({})));
  if (!validation.valid) return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  const input = validation.value;
  const uid = await getUidByEmail(input.email);
  if (!uid) return NextResponse.json({ success: false, error: "No SisterCare account exists with that email" }, { status: 404 });
  const db = getSupabaseAdmin();
  const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", uid).maybeSingle();
  if (profileError || !profile) return NextResponse.json({ success: false, error: "The account profile could not be verified" }, { status: 503 });
  if (["admin", "counsellor"].includes(profile.role)) {
    return NextResponse.json({ success: false, error: "This account already has another privileged role" }, { status: 409 });
  }
  const now = new Date().toISOString();
  const { error: doctorError } = await db.from("doctors").upsert({
    id: uid,
    professional_name: input.professionalName,
    title: input.title,
    bio: input.bio,
    specializations: input.specializations,
    languages: input.languages,
    registration_number: input.registrationNumber,
    licensing_body: input.licensingBody,
    credential_expires_at: input.credentialExpiresAt,
    credential_evidence_reference: input.evidenceReference,
    verification_note: input.verificationNote,
    years_experience: input.yearsExperience,
    verification_status: "verified",
    status: "offline",
    accepting_appointments: false,
    verified_at: now,
    verified_by: auth.uid,
  }, { onConflict: "id" });
  if (doctorError) return NextResponse.json({ success: false, error: "Doctor verification could not be saved" }, { status: 503 });
  const { error: roleError } = await db.from("profiles").update({ role: "doctor" }).eq("id", uid);
  if (roleError) {
    await db.from("doctors").update({ verification_status: "suspended", accepting_appointments: false, status: "offline" }).eq("id", uid);
    return NextResponse.json({ success: false, error: "Doctor role activation failed; the record was suspended" }, { status: 503 });
  }
  await db.from("audit_events").insert({
    event_type: "doctor.verified",
    actor_id: auth.uid,
    subject_id: uid,
    metadata: { licensingBody: input.licensingBody, credentialExpiresAt: input.credentialExpiresAt },
  });
  return NextResponse.json({ success: true, data: { doctorId: uid } }, { status: 201 });
}

async function updateDoctor(request: NextRequest) {
  const auth = await admin(request);
  if (!auth) return NextResponse.json({ success: false, error: "Administrator access required" }, { status: 401 });
  const body = await request.json().catch(() => null) as { doctorId?: string; action?: string } | null;
  if (!body?.doctorId || !["suspend", "restore"].includes(body.action || "")) {
    return NextResponse.json({ success: false, error: "Valid doctor action required" }, { status: 400 });
  }
  const restored = body.action === "restore";
  const { data, error } = await getSupabaseAdmin().from("doctors").update({
    verification_status: restored ? "verified" : "suspended",
    accepting_appointments: false,
    status: "offline",
  }).eq("id", body.doctorId).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ success: false, error: "Doctor status could not be updated" }, { status: 409 });
  return NextResponse.json({ success: true });
}

export const GET = withApiObservability("admin_doctors_get", getDoctors);
export const POST = withApiObservability("admin_doctors_post", verifyDoctor);
export const PATCH = withApiObservability("admin_doctors_patch", updateDoctor);

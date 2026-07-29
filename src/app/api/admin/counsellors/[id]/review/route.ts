import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole, isAuthEnforced } from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/** Approving KYC atomically changes the profile role and creates an offline directory entry. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Counsellor operations are unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified" || !hasRole(auth, "admin")) return NextResponse.json({ success: false, error: "Admin privileges required" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (body.decision !== "approve" && body.decision !== "reject") return NextResponse.json({ success: false, error: "Decision must be approve or reject" }, { status: 400 });
  const { id } = await params; const db = getSupabaseAdmin();
  const { data: application, error } = await db.from("counsellor_applications").select("*").eq("counsellor_id", id).maybeSingle();
  if (error) return NextResponse.json({ success: false, error: "Could not load application" }, { status: 503 });
  if (!application) return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
  if (application.status !== "pending") return NextResponse.json({ success: false, error: "Only pending applications can be reviewed" }, { status: 409 });
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  if (body.decision === "reject") { const result = await db.from("counsellor_applications").update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: auth.uid, review_note: note || "KYC review declined" }).eq("counsellor_id", id); return result.error ? NextResponse.json({ success: false, error: "Could not record review" }, { status: 503 }) : NextResponse.json({ success: true }); }
  const details = application.application as Record<string, unknown>; const profile = details.profile as Record<string, unknown> | undefined; const expiry = new Date(String(details.credentialExpiresAt || ""));
  if (!profile || Number.isNaN(expiry.getTime()) || expiry <= new Date()) return NextResponse.json({ success: false, error: "Cannot approve an expired or incomplete credential" }, { status: 400 });
  const now = new Date().toISOString();
  const updates = await Promise.all([
    db.from("profiles").update({ role: "counsellor" }).eq("id", id),
    db.from("counsellors").upsert({ id, profile: { ...profile, whatsappNumber: profile.phoneNumber, rating: 0, reviewCount: 0, yearsExperience: 0, sessionCount: 0, availableHours: { start: "08:00", end: "17:00", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] }, credentialType: details.credentialType, credentialExpiresAt: expiry.toISOString() }, status: "offline", verification_status: "verified", accepting_new_sessions: true, max_concurrent_sessions: 1 }, { onConflict: "id" }),
    db.from("counsellor_applications").update({ status: "verified", reviewed_at: now, reviewed_by: auth.uid, review_note: note || "KYC approved" }).eq("counsellor_id", id),
    db.from("audit_events").insert({ actor_id: auth.uid, event_type: "counsellor.kyc_approved", subject_id: id, metadata: {} }),
  ]);
  if (updates.some((result) => result.error)) return NextResponse.json({ success: false, error: "Could not approve KYC application" }, { status: 503 });
  return NextResponse.json({ success: true });
}

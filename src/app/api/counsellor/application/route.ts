import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  authorizeCounsellor,
  isAuthEnforced,
} from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { CounsellorSpecialty } from "@/types";
import { resolveApplicationSubmissionStatus } from "@/lib/counsellorApplicationStatus";

const SPECIALTIES: CounsellorSpecialty[] = ["Mental Health", "Menstrual Health", "Reproductive Health", "Nutrition & Wellness", "Pregnancy & Postpartum", "Sexual Health", "Adolescent Health", "Relationship Counselling"];
const text = (value: unknown, maximum: number) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
const ownsPath = (path: string, uid: string) => path.startsWith(`${uid}/`) && !path.slice(uid.length + 1).includes("/");

/** Submits private KYC metadata. Role elevation only happens after admin review. */
export async function POST(request: NextRequest) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Counsellor registration is unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const name = text(body.name, 100), title = text(body.title, 100), bio = text(body.bio, 1200), legalName = text(body.legalName, 160), registrationNumber = text(body.registrationNumber, 120), credentialType = text(body.credentialType, 120), phoneNumber = text(body.phoneNumber, 40), photoPath = text(body.photoURL, 500);
  const languages = Array.isArray(body.languages) ? body.languages.map((item: unknown) => text(item, 40)).filter(Boolean).slice(0, 10) : [];
  const specializations = Array.isArray(body.specializations) ? body.specializations.filter((item: unknown): item is CounsellorSpecialty => SPECIALTIES.includes(item as CounsellorSpecialty)).slice(0, 5) : [];
  const documentReferences = Array.isArray(body.documentReferences) ? body.documentReferences.map((item: unknown) => text(item, 500)).filter(Boolean).slice(0, 5) : [];
  const credentialExpiresAt = new Date(text(body.credentialExpiresAt, 40));
  if (!name || !title || !bio || !legalName || !registrationNumber || !credentialType || !phoneNumber || !ownsPath(photoPath, auth.uid) || !languages.length || !specializations.length || !documentReferences.length || !documentReferences.every((path: string) => ownsPath(path, auth.uid)) || Number.isNaN(credentialExpiresAt.getTime()) || credentialExpiresAt <= new Date()) return NextResponse.json({ success: false, error: "Complete all profile, credential and KYC document fields with a future credential expiry." }, { status: 400 });
  const application = { profile: { name, title, bio, photoURL: photoPath, specializations, languages, phoneNumber }, legalName, registrationNumber, credentialType, credentialExpiresAt: credentialExpiresAt.toISOString(), documentReferences };
  const db = getSupabaseAdmin();
  const { data: existing, error: existingError } = await db.from("counsellor_applications").select("status").eq("counsellor_id", auth.uid).maybeSingle();
  if (existingError) return NextResponse.json({ success: false, error: "Could not load the application" }, { status: 503 });
  let nextStatus: "pending";
  try {
    nextStatus = resolveApplicationSubmissionStatus(
      (existing?.status as "pending" | "verified" | "rejected" | undefined) ||
        null,
    );
  } catch (statusError) {
    return NextResponse.json(
      {
        success: false,
        error:
          statusError instanceof Error
            ? statusError.message
            : "This account cannot submit another application.",
      },
      { status: 409 },
    );
  }
  const { error } = await db.from("counsellor_applications").upsert({ counsellor_id: auth.uid, status: nextStatus, application, submitted_at: new Date().toISOString(), reviewed_at: null, reviewed_by: null, review_note: null }, { onConflict: "counsellor_id" });
  if (error) { console.error("KYC submission failed:", error); return NextResponse.json({ success: false, error: "Could not submit your KYC application." }, { status: 503 }); }
  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Counsellor registration is unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  const access = await authorizeCounsellor(auth);
  if (access.status === "unavailable") {
    return NextResponse.json(
      { success: false, error: "Counsellor verification is temporarily unavailable" },
      { status: 503 },
    );
  }
  const { data, error } = await getSupabaseAdmin().from("counsellor_applications").select("status, application, submitted_at, reviewed_at, review_note").eq("counsellor_id", auth.uid).maybeSingle();
  if (error) return NextResponse.json({ success: false, error: "Could not load the application" }, { status: 503 });
  return NextResponse.json({
    success: true,
    data: {
      account: {
        role:
          access.status === "authorized" ? access.role : "member",
        workspaceAccess: access.status === "authorized",
        repaired: access.status === "authorized" && access.repaired,
      },
      application: data ? {
        status: data.status,
        ...(data.application as object),
        submittedAt: data.submitted_at,
        reviewedAt: data.reviewed_at,
        reviewNote: data.review_note,
      } : null,
    },
  });
}

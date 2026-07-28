import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminDb, isAuthEnforced } from "@/lib/firebaseAdmin";
import { CounsellorSpecialty } from "@/types";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const SPECIALTIES: CounsellorSpecialty[] = [
  "Mental Health", "Menstrual Health", "Reproductive Health",
  "Nutrition & Wellness", "Pregnancy & Postpartum", "Sexual Health",
  "Adolescent Health", "Relationship Counselling",
];

function text(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

/** Submit KYC for review. This never grants a role or makes a person visible. */
export async function POST(request: NextRequest) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Counsellor registration is unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => null) || {};
  const name = text(body.name, 100);
  const title = text(body.title, 100);
  const bio = text(body.bio, 1200);
  const legalName = text(body.legalName, 160);
  const registrationNumber = text(body.registrationNumber, 120);
  const credentialType = text(body.credentialType, 120);
  const phoneNumber = text(body.phoneNumber, 40);
  const photoURL = text(body.photoURL, 1000);
  const languages = Array.isArray(body.languages) ? body.languages.map((item: unknown) => text(item, 40)).filter(Boolean).slice(0, 10) : [];
  const specializations = Array.isArray(body.specializations)
    ? body.specializations.filter((item: unknown): item is CounsellorSpecialty => SPECIALTIES.includes(item as CounsellorSpecialty)).slice(0, 5)
    : [];
  const documentReferences = Array.isArray(body.documentReferences)
    ? body.documentReferences.map((item: unknown) => text(item, 500)).filter(Boolean).slice(0, 5)
    : [];
  const credentialExpiresAt = new Date(text(body.credentialExpiresAt, 40));
  if (!name || !title || !bio || !legalName || !registrationNumber || !credentialType || !phoneNumber || !photoURL || !/^https:\/\//i.test(photoURL) || !languages.length || !specializations.length || !documentReferences.length || Number.isNaN(credentialExpiresAt.getTime()) || credentialExpiresAt <= new Date()) {
    return NextResponse.json({ success: false, error: "Complete all profile, credential and KYC document fields with a future credential expiry." }, { status: 400 });
  }
  const db = getAdminDb()!;
  const existing = await db.collection("counsellorApplications").doc(auth.uid).get();
  if (existing.data()?.status === "verified") return NextResponse.json({ success: false, error: "This account is already verified." }, { status: 409 });
  await db.collection("counsellorApplications").doc(auth.uid).set({
    applicantUid: auth.uid,
    status: "pending",
    profile: { name, title, bio, photoURL, specializations, languages, phoneNumber },
    legalName,
    registrationNumber,
    credentialType,
    credentialExpiresAt: Timestamp.fromDate(credentialExpiresAt),
    documentReferences,
    submittedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    reviewedAt: FieldValue.delete(),
    reviewedBy: FieldValue.delete(),
    reviewNote: FieldValue.delete(),
  }, { merge: true });
  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Counsellor registration is unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  const snapshot = await getAdminDb()!.collection("counsellorApplications").doc(auth.uid).get();
  if (!snapshot.exists) return NextResponse.json({ success: true, data: { application: null } });
  const data = snapshot.data()!;
  const serialize = (value: unknown) => value instanceof Timestamp ? value.toDate().toISOString() : value;
  return NextResponse.json({ success: true, data: { application: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, serialize(value)])) } });
}

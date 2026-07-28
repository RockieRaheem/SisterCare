import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminDb, hasRole, isAuthEnforced, setUserRole } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

/** KYC reviewer decision. Approval atomically creates an offline profile and grants the counsellor claim. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Counsellor operations are unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified" || !hasRole(auth, "admin")) return NextResponse.json({ success: false, error: "Admin privileges required" }, { status: 403 });
  const body = await request.json().catch(() => null) || {};
  const decision = body.decision;
  if (decision !== "approve" && decision !== "reject") return NextResponse.json({ success: false, error: "Decision must be approve or reject" }, { status: 400 });
  const { id } = await params;
  const db = getAdminDb()!;
  const applicationRef = db.collection("counsellorApplications").doc(id);
  const application = await applicationRef.get();
  if (!application.exists) return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
  const data = application.data()!;
  if (data.status !== "pending") return NextResponse.json({ success: false, error: "Only pending applications can be reviewed" }, { status: 409 });
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  if (decision === "reject") {
    await applicationRef.update({ status: "rejected", reviewedAt: FieldValue.serverTimestamp(), reviewedBy: auth.uid, reviewNote: note || "KYC review declined" });
    return NextResponse.json({ success: true });
  }
  const expiry = data.credentialExpiresAt;
  if (!(expiry instanceof Timestamp) || expiry.toMillis() <= Date.now()) return NextResponse.json({ success: false, error: "Cannot approve an expired credential" }, { status: 400 });
  const profile = data.profile || {};
  const counsellorRef = db.collection("counsellors").doc(id);
  const presenceRef = db.collection("presence").doc(id);
  const batch = db.batch();
  batch.set(counsellorRef, {
    ...profile,
    whatsappNumber: profile.phoneNumber,
    status: "offline",
    rating: 0,
    reviewCount: 0,
    yearsExperience: 0,
    sessionCount: 0,
    verified: true,
    verificationStatus: "verified",
    credentialType: data.credentialType,
    credentialExpiresAt: expiry,
    maxConcurrentSessions: 1,
    acceptingNewSessions: true,
    crisisTrained: false,
    availableHours: { start: "08:00", end: "17:00", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] },
    createdAt: FieldValue.serverTimestamp(),
    verificationUpdatedAt: FieldValue.serverTimestamp(),
    verificationUpdatedBy: auth.uid,
  }, { merge: true });
  batch.set(presenceRef, { counsellorId: id, status: "offline", lastHeartbeat: FieldValue.serverTimestamp() }, { merge: true });
  batch.update(applicationRef, { status: "verified", reviewedAt: FieldValue.serverTimestamp(), reviewedBy: auth.uid, reviewNote: note || "KYC approved" });
  await batch.commit();
  await setUserRole(id, "counsellor");
  await db.collection("events").add({ type: "counsellor.kyc_approved", payload: { counsellorId: id, reviewedBy: auth.uid }, createdAt: FieldValue.serverTimestamp() });
  return NextResponse.json({ success: true });
}

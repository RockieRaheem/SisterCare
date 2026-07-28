import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getAdminDb,
  hasRole,
  isAuthEnforced,
} from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { getLiveCounsellors } from "@/lib/server/serverData";

export async function GET(request: NextRequest) {
  if (!isAuthEnforced()) {
    return NextResponse.json(
      { success: false, error: "Counsellor operations are unavailable" },
      { status: 503 },
    );
  }
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified" || !hasRole(auth, "admin")) {
    return NextResponse.json(
      { success: false, error: "Admin privileges required" },
      { status: 403 },
    );
  }

  const db = getAdminDb()!;
  const [liveCounsellors, applicationsSnapshot, presenceSnapshot] = await Promise.all([
    getLiveCounsellors(),
    db.collection("counsellorApplications").where("status", "==", "pending").get(),
    db.collection("presence").get(),
  ]);
  const presenceById = new Map(presenceSnapshot.docs.map((document) => [document.id, document.data()]));
  const counsellors = liveCounsellors.map((counsellor) => {
    const heartbeat = presenceById.get(counsellor.id)?.lastHeartbeat;
    return {
      id: counsellor.id,
      name: counsellor.name || "Unnamed counsellor",
      title: counsellor.title || "Counsellor",
      verificationStatus: counsellor.verificationStatus || "pending",
      credentialExpiresAt:
        counsellor.credentialExpiresAt instanceof Date ? counsellor.credentialExpiresAt.toISOString() : null,
      maxConcurrentSessions: counsellor.maxConcurrentSessions || 1,
      acceptingNewSessions: counsellor.acceptingNewSessions === true,
      crisisTrained: counsellor.crisisTrained === true,
      supervisorId: counsellor.supervisorId || "",
      availableHours: counsellor.availableHours || {
        start: "08:00",
        end: "17:00",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      },
      liveStatus: counsellor.status,
      lastHeartbeat: heartbeat instanceof Timestamp ? heartbeat.toDate().toISOString() : null,
    };
  });

  const applications = applicationsSnapshot.docs.map((document) => {
    const data = document.data();
    const expiry = data.credentialExpiresAt;
    return {
      id: document.id,
      name: data.profile?.name || "Unnamed applicant",
      title: data.profile?.title || "Counsellor",
      legalName: data.legalName || "",
      registrationNumber: data.registrationNumber || "",
      credentialType: data.credentialType || "",
      credentialExpiresAt: expiry instanceof Timestamp ? expiry.toDate().toISOString() : null,
      documentReferences: Array.isArray(data.documentReferences) ? data.documentReferences : [],
    };
  });
  return NextResponse.json({ success: true, data: { counsellors, applications } });
}

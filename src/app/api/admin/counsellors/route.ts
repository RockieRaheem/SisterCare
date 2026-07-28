import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getAdminDb,
  hasRole,
  isAuthEnforced,
} from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

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
  const [snapshot, applicationsSnapshot] = await Promise.all([
    db.collection("counsellors").get(),
    db.collection("counsellorApplications").where("status", "==", "pending").get(),
  ]);
  const counsellors = snapshot.docs.map((document) => {
    const data = document.data();
    const expiry = data.credentialExpiresAt;
    return {
      id: document.id,
      name: data.name || "Unnamed counsellor",
      title: data.title || "Counsellor",
      verificationStatus: data.verificationStatus || "pending",
      credentialExpiresAt:
        expiry instanceof Timestamp ? expiry.toDate().toISOString() : null,
      maxConcurrentSessions: data.maxConcurrentSessions || 1,
      acceptingNewSessions: data.acceptingNewSessions === true,
      crisisTrained: data.crisisTrained === true,
      supervisorId: data.supervisorId || "",
      availableHours: data.availableHours || {
        start: "08:00",
        end: "17:00",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      },
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

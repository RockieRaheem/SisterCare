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

  const snapshot = await getAdminDb()!.collection("counsellors").get();
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

  return NextResponse.json({ success: true, data: { counsellors } });
}


import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole, isAuthEnforced } from "@/lib/firebaseAdmin";
import { getLiveCounsellors } from "@/lib/server/serverData";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type ApplicationPayload = {
  profile?: { name?: string; title?: string };
  legalName?: string;
  registrationNumber?: string;
  credentialType?: string;
  credentialExpiresAt?: string;
  documentReferences?: string[];
};

export async function GET(request: NextRequest) {
  if (!isAuthEnforced()) {
    return NextResponse.json({ success: false, error: "Counsellor operations are unavailable" }, { status: 503 });
  }
  const auth = await authenticateRequest(request);
  if (!hasRole(auth, "admin")) {
    return NextResponse.json({ success: false, error: "Admin privileges required" }, { status: 403 });
  }
  const db = getSupabaseAdmin();
  const [liveCounsellors, applicationsResult] = await Promise.all([
    getLiveCounsellors(),
    db.from("counsellor_applications").select("counsellor_id, application").eq("status", "pending").order("submitted_at", { ascending: true }),
  ]);
  if (applicationsResult.error) {
    return NextResponse.json({ success: false, error: applicationsResult.error.message }, { status: 503 });
  }
  const counsellors = liveCounsellors.map((item) => {
    const heartbeat = (item as typeof item & { lastHeartbeat?: Date }).lastHeartbeat;
    return {
      id: item.id,
      name: item.name || "Unnamed counsellor",
      title: item.title || "Counsellor",
      verificationStatus: item.verificationStatus || "pending",
      credentialExpiresAt: item.credentialExpiresAt instanceof Date ? item.credentialExpiresAt.toISOString() : item.credentialExpiresAt || null,
      maxConcurrentSessions: item.maxConcurrentSessions || 1,
      acceptingNewSessions: item.acceptingNewSessions === true,
      crisisTrained: item.crisisTrained === true,
      supervisorId: item.supervisorId || "",
      availableHours: item.availableHours || { start: "08:00", end: "17:00", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] },
      liveStatus: item.status,
      lastHeartbeat: heartbeat?.toISOString() || null,
    };
  });
  const applications = (applicationsResult.data || []).map((row) => {
    const value = row.application as ApplicationPayload;
    return {
      id: row.counsellor_id,
      name: value.profile?.name || "Unnamed applicant",
      title: value.profile?.title || "Counsellor",
      legalName: value.legalName || "",
      registrationNumber: value.registrationNumber || "",
      credentialType: value.credentialType || "",
      credentialExpiresAt: value.credentialExpiresAt || null,
      documentReferences: Array.isArray(value.documentReferences) ? value.documentReferences : [],
    };
  });
  return NextResponse.json({ success: true, data: { counsellors, applications } });
}

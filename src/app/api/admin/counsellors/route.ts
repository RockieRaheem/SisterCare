import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAuthorizationFailure, isAuthEnforced } from "@/lib/serverAuth";
import { getLiveCounsellors } from "@/lib/server/serverData";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { withApiObservability } from "@/lib/observability";

type ApplicationPayload = {
  profile?: {
    name?: string;
    title?: string;
    languages?: string[];
    specializations?: string[];
  };
  legalName?: string;
  registrationNumber?: string;
  credentialType?: string;
  credentialExpiresAt?: string;
  documentReferences?: string[];
};

async function getCounsellors(request: NextRequest) {
  if (!isAuthEnforced()) {
    return NextResponse.json({ success: false, error: "Counsellor operations are unavailable" }, { status: 503 });
  }
  const auth = await authenticateRequest(request);
  const authorizationFailure = getAuthorizationFailure(auth, "admin");
  if (authorizationFailure) {
    return NextResponse.json({ success: false, error: authorizationFailure.error }, { status: authorizationFailure.status });
  }
  const db = getSupabaseAdmin();
  const [liveCounsellors, applicationsResult] = await Promise.all([
    getLiveCounsellors(),
    db.from("counsellor_applications").select("counsellor_id, application, submitted_at").eq("status", "pending").order("submitted_at", { ascending: true }),
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
      languages: Array.isArray(value.profile?.languages) ? value.profile.languages : [],
      specializations: Array.isArray(value.profile?.specializations) ? value.profile.specializations : [],
      submittedAt: row.submitted_at,
    };
  });
  return NextResponse.json(
    { success: true, data: { counsellors, applications } },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}

export const GET = withApiObservability(
  "admin_counsellors_get",
  getCounsellors,
);

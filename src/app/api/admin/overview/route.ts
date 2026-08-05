import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAuthorizationFailure, isAuthEnforced } from "@/lib/serverAuth";
import { withApiObservability } from "@/lib/observability";
import { getLiveCounsellors } from "@/lib/server/serverData";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const fail = (error: { message?: string } | null) => {
  if (error) throw new Error(error.message || "Supabase query failed");
};

async function getOverview(request: NextRequest) {
  if (!isAuthEnforced()) {
    return NextResponse.json({ success: false, error: "Admin overview is unavailable" }, { status: 503 });
  }
  const auth = await authenticateRequest(request);
  const authorizationFailure = getAuthorizationFailure(auth, "admin");
  if (authorizationFailure) {
    return NextResponse.json({ success: false, error: authorizationFailure.error }, { status: authorizationFailure.status });
  }
  const db = getSupabaseAdmin();
  const [directory, members, applications, liveSessions, incidents] = await Promise.all([
    getLiveCounsellors(),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "member"),
    db.from("counsellor_applications").select("counsellor_id, application").eq("status", "pending").order("submitted_at", { ascending: true }).limit(5),
    db.from("counselling_sessions").select("id, state").in("state", ["requested", "matched", "accepted", "active"]),
    db.from("incidents").select("id", { count: "exact", head: true }).in("status", ["open", "acknowledged"]),
  ]);
  fail(members.error);
  fail(applications.error);
  fail(liveSessions.error);
  fail(incidents.error);
  const sessions = liveSessions.data || [];
  return NextResponse.json(
    {
      success: true,
      data: {
        counts: {
          members: members.count || 0,
          counsellors: directory.length,
          available: directory.filter((item) => item.status === "available").length,
          inSession: directory.filter((item) => item.status === "in_session").length,
          pendingKyc: applications.data?.length || 0,
          liveSessions: sessions.length,
          waiting: sessions.filter((item) => ["requested", "matched"].includes(item.state)).length,
          openIncidents: incidents.count || 0,
        },
        applications: (applications.data || []).map((row) => {
          const value = row.application as { profile?: { name?: string; title?: string } };
          return {
            id: row.counsellor_id,
            name: value.profile?.name || "Unnamed applicant",
            title: value.profile?.title || "Counsellor",
          };
        }),
      },
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}

export const GET = withApiObservability("admin_overview_get", getOverview);

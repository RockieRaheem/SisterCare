import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminDb, hasRole, isAuthEnforced } from "@/lib/firebaseAdmin";
import { getLiveCounsellors } from "@/lib/server/serverData";
import { withApiObservability } from "@/lib/observability";

/** Privacy-safe operational overview for the administrator home. */
async function getOverview(request: NextRequest) {
  if (!isAuthEnforced()) {
    return NextResponse.json({ success: false, error: "Admin overview is unavailable" }, { status: 503 });
  }
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified" || !hasRole(auth, "admin")) {
    return NextResponse.json({ success: false, error: "Admin privileges required" }, { status: 403 });
  }
  const db = getAdminDb()!;
  const [directory, userCount, applications, liveSessions, incidents] = await Promise.all([
    getLiveCounsellors(),
    db.collection("users").count().get(),
    db.collection("counsellorApplications").where("status", "==", "pending").get(),
    db.collection("sessions").where("state", "in", ["requested", "matched", "accepted", "active"]).get(),
    db.collection("incidents").where("status", "in", ["open", "acknowledged"]).get(),
  ]);
  const waiting = liveSessions.docs.filter((document) => ["requested", "matched"].includes(document.data().state)).length;
  return NextResponse.json({
    success: true,
    data: {
      counts: {
        members: userCount.data().count,
        counsellors: directory.length,
        available: directory.filter((counsellor) => counsellor.status === "available").length,
        inSession: directory.filter((counsellor) => counsellor.status === "in_session").length,
        pendingKyc: applications.size,
        liveSessions: liveSessions.size,
        waiting,
        openIncidents: incidents.size,
      },
      applications: applications.docs.slice(0, 5).map((document) => ({
        id: document.id,
        name: document.data().profile?.name || "Unnamed applicant",
        title: document.data().profile?.title || "Counsellor",
      })),
    },
  });
}

export const GET = withApiObservability("admin_overview_get", getOverview);

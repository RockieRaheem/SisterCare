import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getAdminDb,
  hasRole,
  isAuthEnforced,
} from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { IncidentStatus } from "@/lib/incidents";
import { transitionIncident } from "@/lib/server/incidents";
import { withApiObservability } from "@/lib/observability";

async function requireAdmin(request: NextRequest) {
  if (!isAuthEnforced()) return null;
  const auth = await authenticateRequest(request);
  return auth.status === "verified" && hasRole(auth, "admin") ? auth : null;
}

async function getIncidents(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Admin privileges required" },
      { status: 403 },
    );
  }
  const snapshot = await getAdminDb()!
    .collection("incidents")
    .orderBy("openedAt", "desc")
    .limit(100)
    .get();
  const incidents = snapshot.docs.map((document) => {
    const data = document.data();
    const iso = (value: unknown) =>
      value instanceof Timestamp ? value.toDate().toISOString() : null;
    return {
      id: document.id,
      type: data.type,
      severity: data.severity,
      status: data.status,
      sessionId: data.sessionId,
      waitingSecondsAtOpen: data.waitingSecondsAtOpen,
      openedAt: iso(data.openedAt),
      acknowledgedAt: iso(data.acknowledgedAt),
      resolvedAt: iso(data.resolvedAt),
      resolutionNote: data.resolutionNote || "",
    };
  });
  return NextResponse.json({ success: true, data: { incidents } });
}

async function patchIncident(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Admin privileges required" },
      { status: 403 },
    );
  }
  const body = await request.json().catch(() => null);
  const incidentId =
    typeof body?.incidentId === "string" ? body.incidentId : "";
  const to = body?.to as IncidentStatus;
  if (!incidentId || !["acknowledged", "resolved"].includes(to)) {
    return NextResponse.json(
      { success: false, error: "Invalid incident transition" },
      { status: 400 },
    );
  }
  try {
    await transitionIncident({
      incidentId,
      to,
      actorUid: auth.uid,
      resolutionNote:
        typeof body.resolutionNote === "string"
          ? body.resolutionNote
          : undefined,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: message.includes("not found") ? 404 : 409 },
    );
  }
}

export const GET = withApiObservability("admin_incidents_get", getIncidents);
export const PATCH = withApiObservability(
  "admin_incidents_patch",
  patchIncident,
);


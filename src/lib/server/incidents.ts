import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import {
  assertIncidentTransition,
  IncidentStatus,
} from "@/lib/incidents";

export async function openCrisisIncident(params: {
  sessionId: string;
  waitingSeconds: number;
}): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await db
    .collection("incidents")
    .doc(`crisis-${params.sessionId}`)
    .set(
      {
        type: "crisis_sla_breach",
        severity: "critical",
        status: "open",
        sessionId: params.sessionId,
        waitingSecondsAtOpen: params.waitingSeconds,
        openedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

export async function transitionIncident(params: {
  incidentId: string;
  to: IncidentStatus;
  actorUid: string;
  resolutionNote?: string;
}): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Incident service unavailable");
  const ref = db.collection("incidents").doc(params.incidentId);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new Error("Incident not found");
    const from = snapshot.data()!.status as IncidentStatus;
    assertIncidentTransition(from, params.to);
    transaction.update(ref, {
      status: params.to,
      updatedAt: FieldValue.serverTimestamp(),
      ...(params.to === "acknowledged"
        ? {
            acknowledgedAt: FieldValue.serverTimestamp(),
            acknowledgedBy: params.actorUid,
          }
        : {
            resolvedAt: FieldValue.serverTimestamp(),
            resolvedBy: params.actorUid,
            resolutionNote: (params.resolutionNote || "").slice(0, 1000),
          }),
    });
  });
}


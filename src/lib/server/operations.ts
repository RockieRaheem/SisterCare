import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";

const STALE_AFTER_MS = 20 * 60 * 1000;

export async function recordMaintenanceRun(job: "session_sweep" | "availability_sync", success: boolean, details: Record<string, number> = {}) {
  const db = getAdminDb();
  if (!db) return;
  await db.collection("operations_heartbeats").doc(job).set({ job, success, details, ranAt: FieldValue.serverTimestamp() }, { merge: true });
}

export async function getMaintenanceReadiness(now = Date.now()): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return true;
  const db = getAdminDb();
  if (!db) return false;
  const snapshot = await db.collection("operations_heartbeats").get();
  const byId = new Map(snapshot.docs.map((document) => [document.id, document.data()]));
  return ["session_sweep", "availability_sync"].every((job) => {
    const data = byId.get(job); const ranAt = data?.ranAt;
    return data?.success === true && ranAt instanceof Timestamp && now - ranAt.toMillis() <= STALE_AFTER_MS;
  });
}

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getAdminDb,
  hasRole,
  isAuthEnforced,
} from "@/lib/firebaseAdmin";
import { withApiObservability } from "@/lib/observability";

async function getMetrics(request: NextRequest) {
  if (!isAuthEnforced()) {
    return NextResponse.json(
      { success: false, error: "Metrics are unavailable" },
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
  const snapshot = await getAdminDb()!
    .collection("metrics_daily")
    .orderBy("date", "desc")
    .limit(14)
    .get();
  const days = snapshot.docs.map((document) => {
    const { updatedAt: _updatedAt, ...data } = document.data();
    return { date: document.id, ...data };
  });
  return NextResponse.json({ success: true, data: { days } });
}

export const GET = withApiObservability("admin_metrics_get", getMetrics);


import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAuthorizationFailure, isAuthEnforced } from "@/lib/serverAuth";
import { withApiObservability } from "@/lib/observability";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

async function getMetrics(request: NextRequest) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Metrics are unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  const authorizationFailure = getAuthorizationFailure(auth, "admin");
  if (authorizationFailure) return NextResponse.json({ success: false, error: authorizationFailure.error }, { status: authorizationFailure.status });
  const { data, error } = await getSupabaseAdmin().from("metrics_daily").select("date, metrics").order("date", { ascending: false }).limit(14);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 503 });
  const days = (data || []).map((row) => ({ date: row.date, ...((row.metrics as Record<string, number>) || {}) }));
  return NextResponse.json({ success: true, data: { days } });
}

export const GET = withApiObservability("admin_metrics_get", getMetrics);

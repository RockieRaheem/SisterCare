import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole, isAuthEnforced } from "@/lib/firebaseAdmin";
import { withApiObservability } from "@/lib/observability";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

async function getMetrics(request: NextRequest) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Metrics are unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  if (!hasRole(auth, "admin")) return NextResponse.json({ success: false, error: "Admin privileges required" }, { status: 403 });
  const { data, error } = await getSupabaseAdmin().from("metrics_daily").select("date, metrics").order("date", { ascending: false }).limit(14);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 503 });
  const days = (data || []).map((row) => ({ date: row.date, ...((row.metrics as Record<string, number>) || {}) }));
  return NextResponse.json({ success: true, data: { days } });
}

export const GET = withApiObservability("admin_metrics_get", getMetrics);

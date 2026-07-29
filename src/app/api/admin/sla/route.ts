import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole, isAuthEnforced } from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { withApiObservability } from "@/lib/observability";

async function getSla(request: NextRequest) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Crisis monitoring is unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  if (!hasRole(auth, "admin")) return NextResponse.json({ success: false, error: "Admin privileges required" }, { status: 403 });
  const { data, error } = await getSupabaseAdmin().from("counselling_sessions")
    .select("id, state, counsellor_id, requested_at, accepted_at, time_to_human_seconds, details")
    .eq("priority", "critical")
    .order("requested_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 503 });
  const now = Date.now();
  const sessions = (data || []).map((row) => {
    const details = row.details as { counsellorName?: string };
    return {
      id: row.id,
      state: row.state,
      requestedAt: row.requested_at,
      acceptedAt: row.accepted_at,
      counsellorId: row.counsellor_id,
      counsellorName: details?.counsellorName || null,
      timeToHumanSeconds: row.time_to_human_seconds,
    };
  });
  const waiting = sessions.filter((item) => ["requested", "matched"].includes(item.state)).map((item) => ({
    id: item.id,
    state: item.state,
    counsellorName: item.counsellorName,
    waitingSeconds: Math.max(0, Math.round((now - new Date(item.requestedAt).getTime()) / 1000)),
  }));
  const handledTimes = sessions.map((item) => item.timeToHumanSeconds).filter((value): value is number => typeof value === "number").sort((a, b) => a - b);
  const percentile = (p: number) => handledTimes.length ? handledTimes[Math.min(handledTimes.length - 1, Math.floor((p / 100) * handledTimes.length))] : null;
  return NextResponse.json({ success: true, data: {
    waiting,
    handledCount: handledTimes.length,
    avgSeconds: handledTimes.length ? Math.round(handledTimes.reduce((sum, value) => sum + value, 0) / handledTimes.length) : null,
    p90Seconds: percentile(90),
    maxSeconds: handledTimes.length ? handledTimes[handledTimes.length - 1] : null,
    recent: sessions.slice(0, 20),
  } });
}

export const GET = withApiObservability("admin_sla_get", getSla);

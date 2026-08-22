import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getAuthorizationFailure,
  isAuthEnforced,
} from "@/lib/serverAuth";
import { withApiObservability } from "@/lib/observability";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

async function requireAdmin(request: NextRequest) {
  if (!isAuthEnforced()) return { error: "Safety duty is unavailable", status: 503 } as const;
  const auth = await authenticateRequest(request);
  const failure = getAuthorizationFailure(auth, "admin");
  if (failure) return { error: failure.error, status: failure.status } as const;
  if (auth.status !== "verified") return { error: "Authentication required", status: 401 } as const;
  return { auth } as const;
}

async function getDuty(request: NextRequest) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  const db = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - 3 * 60_000).toISOString();
  const [own, coverage, assigned] = await Promise.all([
    db.from("safety_duty_roster").select("active,started_at,heartbeat_at").eq("responder_id", admin.auth.uid).maybeSingle(),
    db.from("safety_duty_roster").select("responder_id", { count: "exact", head: true }).eq("active", true).gte("heartbeat_at", cutoff),
    db.from("incidents").select("id", { count: "exact", head: true }).eq("assigned_to", admin.auth.uid).in("status", ["open", "acknowledged"]),
  ]);
  if (own.error || coverage.error || assigned.error) {
    return NextResponse.json({ success: false, error: "Safety duty could not be refreshed" }, { status: 503 });
  }
  return NextResponse.json({
    success: true,
    data: {
      selected: own.data?.active === true,
      covered: (coverage.count || 0) > 0,
      activeResponders: coverage.count || 0,
      assignedOpenCases: assigned.count || 0,
      heartbeatAt: own.data?.heartbeat_at || null,
      startedAt: own.data?.started_at || null,
    },
  });
}

async function setDuty(request: NextRequest) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  const body = await request.json().catch(() => null) as { active?: unknown } | null;
  if (typeof body?.active !== "boolean") {
    return NextResponse.json({ success: false, error: "active must be true or false" }, { status: 400 });
  }
  const { error } = await getSupabaseAdmin().rpc("set_safety_duty", {
    target_responder: admin.auth.uid,
    target_active: body.active,
  });
  if (error) return NextResponse.json({ success: false, error: "Safety duty could not be updated" }, { status: 503 });
  return NextResponse.json({ success: true, data: { selected: body.active } });
}

export const GET = withApiObservability("admin_safety_duty_get", getDuty);
export const POST = withApiObservability("admin_safety_duty_set", setDuty);

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthEnforced,
  hasRole,
} from "@/lib/serverAuth";
import { sweepSessions } from "@/lib/server/sessions";
import { recordMaintenanceRun } from "@/lib/server/operations";

function isScheduler(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && (request.headers.get("x-cron-secret") === secret || request.headers.get("authorization") === `Bearer ${secret}`));
}

async function run(request: NextRequest, cronOnly = false) {

/**
 * POST /api/sessions/sweep — periodic maintenance (cron every few minutes):
 * rematch matched-but-unaccepted sessions past the accept timeout, expire
 * stale normal requests, drain the queue. Auth: CRON_SECRET header or admin.
 */
  if (!isAuthEnforced()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Session sweep requires SUPABASE_SECRET_KEY to be configured.",
      },
      { status: 503 },
    );
  }

  const scheduler = isScheduler(request);

  if (!scheduler) {
    if (cronOnly) return NextResponse.json({ success: false, error: "Scheduler authentication required" }, { status: 401 });
    const auth = await authenticateRequest(request);
    if (!hasRole(auth, "admin")) {
      return NextResponse.json(
        { success: false, error: "Admin privileges or CRON_SECRET required" },
        { status: 403 },
      );
    }
  }

  try {
    const result = await sweepSessions();
    await recordMaintenanceRun("session_sweep", true, result);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    await recordMaintenanceRun("session_sweep", false);
    console.error("Session sweep failed:", error);
    return NextResponse.json(
      { success: false, error: "Session sweep failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) { return run(request); }
export async function GET(request: NextRequest) { return run(request, true); }

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthEnforced,
  hasRole,
} from "@/lib/firebaseAdmin";
import { sweepSessions } from "@/lib/server/sessions";

/**
 * POST /api/sessions/sweep — periodic maintenance (cron every few minutes):
 * rematch matched-but-unaccepted sessions past the accept timeout, expire
 * stale normal requests, drain the queue. Auth: CRON_SECRET header or admin.
 */
export async function POST(request: NextRequest) {
  if (!isAuthEnforced()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Session sweep requires FIREBASE_SERVICE_ACCOUNT_KEY to be configured.",
      },
      { status: 503 },
    );
  }

  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get("x-cron-secret");
  const isScheduler = Boolean(cronSecret && providedSecret === cronSecret);

  if (!isScheduler) {
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
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Session sweep failed:", error);
    return NextResponse.json(
      { success: false, error: "Session sweep failed" },
      { status: 500 },
    );
  }
}

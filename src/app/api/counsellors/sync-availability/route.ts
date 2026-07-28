import { NextRequest, NextResponse } from "next/server";
import { batchUpdateCounsellorAvailability } from "@/lib/server/serverData";
import { authenticateRequest, hasRole } from "@/lib/firebaseAdmin";
import { recordMaintenanceRun } from "@/lib/server/operations";

function isScheduler(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && (request.headers.get("x-cron-secret") === secret || request.headers.get("authorization") === `Bearer ${secret}`));
}

async function run(request: NextRequest, cronOnly = false) {
  // Operational endpoint. Schedulers authenticate with the shared
  // CRON_SECRET header; interactive callers need a signed-in session.
  const scheduler = isScheduler(request);

  if (!scheduler) {
    if (cronOnly) return NextResponse.json({ success: false, error: "Scheduler authentication required" }, { status: 401 });
    const auth = await authenticateRequest(request);
    if (auth.status !== "verified") {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }
    if (!hasRole(auth, "admin")) {
      return NextResponse.json(
        { success: false, error: "Admin privileges required" },
        { status: 403 },
      );
    }
  }

  try {
    const result = await batchUpdateCounsellorAvailability();
    await recordMaintenanceRun("availability_sync", result.errors === 0, result);
    return NextResponse.json({
      success: true,
      ...result,
      message: `Updated ${result.updated} counsellor(s), ${result.errors} error(s)`,
    });
  } catch (error) {
    await recordMaintenanceRun("availability_sync", false);
    console.error("Availability sync failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync availability" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) { return run(request); }
export async function GET(request: NextRequest) { return run(request, true); }

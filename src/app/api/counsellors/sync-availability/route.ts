import { NextRequest, NextResponse } from "next/server";
import { batchUpdateCounsellorAvailability } from "@/lib/server/serverData";
import { authenticateRequest } from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
  // Operational endpoint. Schedulers authenticate with the shared
  // CRON_SECRET header; interactive callers need a signed-in session.
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get("x-cron-secret");
  const isScheduler = Boolean(cronSecret && providedSecret === cronSecret);

  if (!isScheduler) {
    const auth = await authenticateRequest(request);
    if (auth.status === "unauthenticated") {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }
  }

  try {
    const result = await batchUpdateCounsellorAvailability();
    return NextResponse.json({
      success: true,
      ...result,
      message: `Updated ${result.updated} counsellor(s), ${result.errors} error(s)`,
    });
  } catch (error) {
    console.error("Availability sync failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync availability" },
      { status: 500 },
    );
  }
}

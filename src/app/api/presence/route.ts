import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  authorizeCounsellor,
  getAuthorizationFailure,
  isAuthEnforced,
} from "@/lib/serverAuth";
import { recordHeartbeat, setOffline } from "@/lib/server/sessions";
import {
  CounsellorEligibilityError,
  describeCounsellorEligibilityFailure,
} from "@/lib/counsellorOperations";

/**
 * POST /api/presence — counsellor presence heartbeat.
 * Body: { status: "available" | "offline" }
 *
 * The counsellor portal sends this every ~60s while the availability toggle
 * is on. A heartbeat going "available" drains the session queue toward this
 * counsellor — this is how "keep routing when counsellors declare themselves
 * free" actually happens.
 */
export async function POST(request: NextRequest) {
  if (!isAuthEnforced()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Presence requires SUPABASE_SECRET_KEY to be configured.",
      },
      { status: 503 },
    );
  }

  const auth = await authenticateRequest(request);
  const authorizationFailure = getAuthorizationFailure(auth);
  if (authorizationFailure) {
    return NextResponse.json(
      { success: false, error: authorizationFailure.error },
      { status: authorizationFailure.status },
    );
  }
  if (auth.status !== "verified") {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }
  const counsellorAccess = await authorizeCounsellor(auth);
  if (counsellorAccess.status === "unavailable") {
    return NextResponse.json(
      {
        success: false,
        error:
          "Counsellor verification is temporarily unavailable. Please retry.",
      },
      { status: 503 },
    );
  }
  if (counsellorAccess.status !== "authorized") {
    return NextResponse.json(
      {
        success: false,
        error:
          "Verified counsellor access required. Refresh your application status before going available.",
      },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) || {};
  const status = body.status as "available" | "offline";
  if (!["available", "offline"].includes(status)) {
    return NextResponse.json(
      { success: false, error: "status must be available or offline" },
      { status: 400 },
    );
  }

  try {
    if (status === "offline") {
      await setOffline(auth.uid);
      return NextResponse.json({
        success: true,
        data: { drained: 0, status: "offline" },
      });
    }
    const { drained, status: effectiveStatus } = await recordHeartbeat(auth.uid, status);
    return NextResponse.json({ success: true, data: { drained, status: effectiveStatus } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Presence update failed";
    const ineligible =
      error instanceof CounsellorEligibilityError ||
      message.includes("profile required");
    if (!ineligible) console.error("Presence update failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: ineligible
          ? error instanceof CounsellorEligibilityError
            ? describeCounsellorEligibilityFailure(error.reasons)
            : "Your verified counsellor profile is still being prepared. Refresh and try again."
          : "Presence update failed",
      },
      { status: ineligible ? 403 : 500 },
    );
  }
}

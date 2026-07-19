import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthEnforced,
  hasRole,
} from "@/lib/firebaseAdmin";
import { recordHeartbeat, setOffline } from "@/lib/server/sessions";

/**
 * POST /api/presence — counsellor presence heartbeat.
 * Body: { status: "available" | "busy" | "offline" }
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
          "Presence requires FIREBASE_SERVICE_ACCOUNT_KEY to be configured.",
      },
      { status: 503 },
    );
  }

  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }
  if (!hasRole(auth, "counsellor") && !hasRole(auth, "admin")) {
    return NextResponse.json(
      { success: false, error: "Counsellor role required" },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) || {};
  const status = body.status as "available" | "busy" | "offline";
  if (!["available", "busy", "offline"].includes(status)) {
    return NextResponse.json(
      { success: false, error: "status must be available, busy, or offline" },
      { status: 400 },
    );
  }

  try {
    if (status === "offline") {
      await setOffline(auth.uid);
      return NextResponse.json({ success: true, data: { drained: 0 } });
    }
    const { drained } = await recordHeartbeat(auth.uid, status);
    return NextResponse.json({ success: true, data: { drained } });
  } catch (error) {
    console.error("Presence update failed:", error);
    return NextResponse.json(
      { success: false, error: "Presence update failed" },
      { status: 500 },
    );
  }
}

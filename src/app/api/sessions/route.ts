import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getAuthorizationFailure,
  isAuthEnforced,
  hasRole,
} from "@/lib/serverAuth";
import {
  createSessionRequest,
  listSessionsForUser,
  listSessionsForCounsellor,
} from "@/lib/server/sessions";
import { CounsellorSpecialty } from "@/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sessionsUnavailable() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Counselling sessions require SUPABASE_SECRET_KEY to be configured.",
    },
    { status: 503 },
  );
}

/**
 * POST /api/sessions — request a counselling session as the signed-in user.
 * Body: { summary?, specialty?, preferredLanguage? }
 *
 * Client-created sessions are always priority "normal": the crisis lane is
 * entered only via server-side triage in /api/chat, so queue preemption can't
 * be self-assigned.
 */
export async function POST(request: NextRequest) {
  if (!isAuthEnforced()) return sessionsUnavailable();

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

  const body = (await request.json().catch(() => null)) || {};
  if (
    body.preferredCounsellorId !== undefined &&
    (typeof body.preferredCounsellorId !== "string" ||
      !UUID_PATTERN.test(body.preferredCounsellorId))
  ) {
    return NextResponse.json(
      { success: false, error: "Select a valid counsellor profile" },
      { status: 400 },
    );
  }

  try {
    const session = await createSessionRequest({
      userId: auth.uid,
      reason: "user_request",
      priority: "normal",
      summary:
        typeof body.summary === "string" && body.summary.trim()
          ? body.summary.trim()
          : "Member requested a counselling session",
      specialty:
        typeof body.specialty === "string"
          ? (body.specialty as CounsellorSpecialty)
          : undefined,
      preferredLanguage:
        typeof body.preferredLanguage === "string"
          ? body.preferredLanguage
          : undefined,
      preferredCounsellorId:
        typeof body.preferredCounsellorId === "string"
          ? body.preferredCounsellorId
          : undefined,
      conversationId:
        typeof body.conversationId === "string"
          ? body.conversationId
          : undefined,
      explicitSummaryConsent: body.shareSummary === true,
    });
    return NextResponse.json({ success: true, data: { session } });
  } catch (error) {
    console.error("Failed to create session request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create session request" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/sessions — list sessions for the caller.
 * Users get their own sessions; counsellors also get the open crisis queue.
 */
export async function GET(request: NextRequest) {
  if (!isAuthEnforced()) return sessionsUnavailable();

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

  try {
    if (hasRole(auth, "counsellor") || hasRole(auth, "admin")) {
      const data = await listSessionsForCounsellor(auth.uid);
      return NextResponse.json({ success: true, data });
    }
    const sessions = await listSessionsForUser(auth.uid);
    return NextResponse.json({ success: true, data: { sessions } });
  } catch (error) {
    console.error("Failed to list sessions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list sessions" },
      { status: 500 },
    );
  }
}

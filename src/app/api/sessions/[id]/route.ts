import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthEnforced } from "@/lib/serverAuth";
import { getSession } from "@/lib/server/sessions";

/**
 * GET /api/sessions/:id — session detail, participants only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthEnforced()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Counselling sessions require FIREBASE_SERVICE_ACCOUNT_KEY to be configured.",
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

  const { id } = await params;

  try {
    const session = await getSession(id);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }
    const isParticipant =
      auth.uid === session.userId || auth.uid === session.counsellorId;
    if (!isParticipant) {
      return NextResponse.json(
        { success: false, error: "Not a participant of this session" },
        { status: 403 },
      );
    }
    return NextResponse.json({ success: true, data: { session } });
  } catch (error) {
    console.error("Failed to load session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load session" },
      { status: 500 },
    );
  }
}

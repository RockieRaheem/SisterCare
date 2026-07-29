import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthEnforced,
  hasRole,
} from "@/lib/serverAuth";
import {
  acceptSession,
  declineSession,
  endSession,
  escalateSession,
  submitFeedback,
} from "@/lib/server/sessions";

type TransitionAction = "accept" | "decline" | "end" | "escalate" | "feedback";

/**
 * POST /api/sessions/:id/transition
 * Body: { action: "accept" | "decline" | "end" | "escalate" | "feedback",
 *         rating?, comment? }
 *
 * accept/decline/escalate → counsellor role; end → either participant;
 * feedback → the session's user. Fine-grained ownership checks live in the
 * session engine; invalid state transitions surface as 409.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthEnforced()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Counselling sessions require SUPABASE_SECRET_KEY to be configured.",
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
  const body = (await request.json().catch(() => null)) || {};
  const action = body.action as TransitionAction;

  const counsellorActions: TransitionAction[] = [
    "accept",
    "decline",
    "escalate",
  ];
  if (
    counsellorActions.includes(action) &&
    !hasRole(auth, "counsellor") &&
    !hasRole(auth, "admin")
  ) {
    return NextResponse.json(
      { success: false, error: "Counsellor role required" },
      { status: 403 },
    );
  }

  try {
    switch (action) {
      case "accept": {
        const session = await acceptSession(id, auth.uid);
        return NextResponse.json({ success: true, data: { session } });
      }
      case "decline":
        await declineSession(id, auth.uid);
        return NextResponse.json({ success: true });
      case "end":
        await endSession(id, auth.uid);
        return NextResponse.json({ success: true });
      case "escalate":
        await escalateSession(id, auth.uid);
        return NextResponse.json({ success: true });
      case "feedback":
        await submitFeedback(id, auth.uid, Number(body.rating), body.comment);
        return NextResponse.json({ success: true });
      default:
        return NextResponse.json(
          { success: false, error: "Unknown action" },
          { status: 400 },
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message.startsWith("Invalid session transition")
      ? 409
      : message.includes("not assigned") ||
          message.includes("participant") ||
          message.includes("can leave feedback")
        ? 403
        : message.includes("not found")
          ? 404
          : 500;
    if (status === 500) console.error("Session transition failed:", error);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

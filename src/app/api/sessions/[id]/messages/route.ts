import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getAuthorizationFailure,
  isAuthEnforced,
} from "@/lib/serverAuth";
import {
  listSessionMessages,
  sendSessionMessage,
} from "@/lib/server/sessions";

function unavailable() {
  return NextResponse.json(
    { success: false, error: "Secure session messaging is unavailable" },
    { status: 503 },
  );
}

function messageFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "Message request failed";
  const status = message.includes("participant")
    ? 403
    : message.includes("not found")
      ? 404
      : message.includes("empty") ||
          message.includes("too long") ||
          message.includes("active session")
        ? 409
        : 500;
  if (status === 500) console.error("Session message request failed:", error);
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthEnforced()) return unavailable();
  const auth = await authenticateRequest(request);
  const failure = getAuthorizationFailure(auth);
  if (failure || auth.status !== "verified") {
    return NextResponse.json(
      { success: false, error: failure?.error || "Authentication required" },
      { status: failure?.status || 401 },
    );
  }
  try {
    const { id } = await params;
    const messages = await listSessionMessages(id, auth.uid);
    return NextResponse.json(
      { success: true, data: { messages } },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    return messageFailure(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthEnforced()) return unavailable();
  const auth = await authenticateRequest(request);
  const failure = getAuthorizationFailure(auth);
  if (failure || auth.status !== "verified") {
    return NextResponse.json(
      { success: false, error: failure?.error || "Authentication required" },
      { status: failure?.status || 401 },
    );
  }
  const body = await request.json().catch(() => ({}));
  try {
    const { id } = await params;
    const message = await sendSessionMessage(
      id,
      auth.uid,
      typeof body.text === "string" ? body.text : "",
      request.headers.get("idempotency-key") || undefined,
    );
    return NextResponse.json({ success: true, data: { message } });
  } catch (error) {
    return messageFailure(error);
  }
}

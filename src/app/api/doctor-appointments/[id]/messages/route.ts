import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAuthorizationFailure, isAuthEnforced } from "@/lib/serverAuth";
import { listDoctorMessages, sendDoctorMessage } from "@/lib/server/doctorCare";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function identity(request: NextRequest) {
  if (!isAuthEnforced()) return null;
  const auth = await authenticateRequest(request);
  return getAuthorizationFailure(auth) || auth.status !== "verified" ? null : auth;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await identity(request);
  if (!auth) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ success: false, error: "Valid appointment required" }, { status: 400 });
  try {
    return NextResponse.json({ success: true, data: { messages: await listDoctorMessages(id, auth.uid) } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Messages could not be loaded" }, { status: 404 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await identity(request);
  if (!auth) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { text?: string; clientMessageId?: string } | null;
  if (!UUID.test(id) || !body?.text || !body.clientMessageId || body.text.length > 2000) {
    return NextResponse.json({ success: false, error: "Valid private message required" }, { status: 400 });
  }
  try {
    const message = await sendDoctorMessage({ appointmentId: id, uid: auth.uid, text: body.text, clientMessageId: body.clientMessageId });
    return NextResponse.json({ success: true, data: { message } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Message could not be sent" }, { status: 409 });
  }
}

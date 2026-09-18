import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getAuthorizationFailure,
  isAuthEnforced,
} from "@/lib/serverAuth";
import {
  cancelDoctorAppointment,
  listMemberDoctorAppointments,
  requestDoctorAppointment,
} from "@/lib/server/doctorCare";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function member(request: NextRequest) {
  if (!isAuthEnforced()) return null;
  const auth = await authenticateRequest(request);
  return getAuthorizationFailure(auth) || auth.status !== "verified"
    ? null
    : auth;
}

export async function GET(request: NextRequest) {
  const auth = await member(request);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }
  try {
    const appointments = await listMemberDoctorAppointments(auth.uid);
    return NextResponse.json(
      { success: true, data: { appointments } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Failed to list doctor appointments:", error);
    return NextResponse.json(
      { success: false, error: "Doctor requests could not be loaded" },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await member(request);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }
  if (auth.token.role && auth.token.role !== "user") {
    return NextResponse.json(
      { success: false, error: "Member access required" },
      { status: 403 },
    );
  }
  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const specialty = typeof body?.specialty === "string"
    ? body.specialty.trim()
    : "";
  const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
  const language = typeof body?.preferredLanguage === "string"
    ? body.preferredLanguage.trim()
    : "English";
  const preferredDoctorId =
    typeof body?.preferredDoctorId === "string" ? body.preferredDoctorId : undefined;
  if (!specialty || specialty.length > 100 || summary.length > 500) {
    return NextResponse.json(
      { success: false, error: "Provide a valid specialty and short summary" },
      { status: 400 },
    );
  }
  if (preferredDoctorId && !UUID.test(preferredDoctorId)) {
    return NextResponse.json(
      { success: false, error: "Select a valid doctor" },
      { status: 400 },
    );
  }
  try {
    const appointment = await requestDoctorAppointment({
      memberId: auth.uid,
      specialty,
      summary,
      preferredLanguage: language,
      preferredDoctorId,
      urgency: "routine",
    });
    return NextResponse.json(
      { success: true, data: { appointment } },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    const conflict = message.includes("already exists");
    return NextResponse.json(
      { success: false, error: message },
      { status: conflict ? 409 : 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await member(request);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }
  const appointmentId = request.nextUrl.searchParams.get("id") || "";
  if (!UUID.test(appointmentId)) {
    return NextResponse.json(
      { success: false, error: "Valid appointment required" },
      { status: 400 },
    );
  }
  try {
    await cancelDoctorAppointment(auth.uid, appointmentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cancellation failed",
      },
      { status: 409 },
    );
  }
}

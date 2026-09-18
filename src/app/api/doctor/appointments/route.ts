import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authorizeDoctor, getAuthorizationFailure, isAuthEnforced } from "@/lib/serverAuth";
import { listDoctorAppointments, transitionDoctorAppointment } from "@/lib/server/doctorCare";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function doctor(request: NextRequest) {
  if (!isAuthEnforced()) return null;
  const auth = await authenticateRequest(request);
  if (getAuthorizationFailure(auth) || auth.status !== "verified") return null;
  const access = await authorizeDoctor(auth);
  return access.status === "authorized" && access.role === "doctor" ? auth : null;
}

export async function GET(request: NextRequest) {
  const auth = await doctor(request);
  if (!auth) return NextResponse.json({ success: false, error: "Verified doctor access required" }, { status: 403 });
  try {
    return NextResponse.json({ success: true, data: { appointments: await listDoctorAppointments(auth.uid) } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Doctor appointments failed:", error);
    return NextResponse.json({ success: false, error: "Appointments could not be loaded" }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await doctor(request);
  if (!auth) return NextResponse.json({ success: false, error: "Verified doctor access required" }, { status: 403 });
  const body = await request.json().catch(() => null) as { appointmentId?: string; to?: string } | null;
  if (!body?.appointmentId || !UUID.test(body.appointmentId) || !["booked", "in_consultation", "completed", "declined"].includes(body.to || "")) {
    return NextResponse.json({ success: false, error: "Valid appointment transition required" }, { status: 400 });
  }
  try {
    const appointment = await transitionDoctorAppointment({ doctorId: auth.uid, appointmentId: body.appointmentId, to: body.to as "booked" | "in_consultation" | "completed" | "declined" });
    return NextResponse.json({ success: true, data: { appointment } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Appointment update failed" }, { status: 409 });
  }
}

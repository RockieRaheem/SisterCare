import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authorizeDoctor, getAuthorizationFailure, isAuthEnforced } from "@/lib/serverAuth";
import { getClinicalRuntimeIssues } from "@/lib/clinicalGovernance";
import { issueDoctorPrescription, listPrescriptions, validatePrescriptionDraft, voidDoctorPrescription } from "@/lib/server/doctorCare";

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
    return NextResponse.json({ success: true, data: { prescriptions: await listPrescriptions({ doctorId: auth.uid }) } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "Prescription records could not be loaded" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await doctor(request);
  if (!auth) return NextResponse.json({ success: false, error: "Verified doctor access required" }, { status: 403 });
  if (getClinicalRuntimeIssues().length > 0) {
    return NextResponse.json(
      { success: false, error: "Prescription issuance is paused until the clinical release review is complete" },
      { status: 503 },
    );
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const appointmentId = typeof body?.appointmentId === "string" ? body.appointmentId : "";
  if (!UUID.test(appointmentId)) return NextResponse.json({ success: false, error: "Valid consultation required" }, { status: 400 });
  const validation = validatePrescriptionDraft(body || {});
  if (!validation.valid) return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  try {
    const prescription = await issueDoctorPrescription({ doctorId: auth.uid, appointmentId, draft: validation.value });
    return NextResponse.json({ success: true, data: { prescription } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Prescription could not be issued" }, { status: 409 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await doctor(request);
  if (!auth) return NextResponse.json({ success: false, error: "Verified doctor access required" }, { status: 403 });
  const body = await request.json().catch(() => null) as { prescriptionId?: string; reason?: string } | null;
  if (!body?.prescriptionId || !UUID.test(body.prescriptionId) || typeof body.reason !== "string") {
    return NextResponse.json({ success: false, error: "Valid prescription and withdrawal reason required" }, { status: 400 });
  }
  try {
    const prescription = await voidDoctorPrescription({ doctorId: auth.uid, prescriptionId: body.prescriptionId, reason: body.reason });
    return NextResponse.json({ success: true, data: { prescription } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Prescription could not be withdrawn" }, { status: 409 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAuthorizationFailure, isAuthEnforced } from "@/lib/serverAuth";
import { listPrescriptions } from "@/lib/server/doctorCare";

export async function GET(request: NextRequest) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Prescription records are unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  const failure = getAuthorizationFailure(auth);
  if (failure || auth.status !== "verified") return NextResponse.json({ success: false, error: failure?.error || "Authentication required" }, { status: failure?.status || 401 });
  if (auth.token.role && auth.token.role !== "user") return NextResponse.json({ success: false, error: "Member access required" }, { status: 403 });
  try {
    return NextResponse.json({ success: true, data: { prescriptions: await listPrescriptions({ memberId: auth.uid }) } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "Prescription records could not be loaded" }, { status: 503 });
  }
}

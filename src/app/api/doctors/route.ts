import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getAuthorizationFailure,
  isAuthEnforced,
} from "@/lib/serverAuth";
import { listVerifiedDoctors } from "@/lib/server/doctorCare";

export async function GET(request: NextRequest) {
  if (!isAuthEnforced()) {
    return NextResponse.json(
      { success: false, error: "Doctor directory is unavailable" },
      { status: 503 },
    );
  }
  const auth = await authenticateRequest(request);
  const failure = getAuthorizationFailure(auth);
  if (failure) {
    return NextResponse.json(
      { success: false, error: failure.error },
      { status: failure.status },
    );
  }
  try {
    const doctors = await listVerifiedDoctors();
    return NextResponse.json(
      {
        success: true,
        data: { doctors, refreshedAt: new Date().toISOString() },
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Failed to load doctor directory:", error);
    return NextResponse.json(
      { success: false, error: "Doctor availability could not be refreshed" },
      { status: 503 },
    );
  }
}

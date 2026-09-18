import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authorizeDoctor, getAuthorizationFailure, isAuthEnforced } from "@/lib/serverAuth";
import { getDoctorPresence, updateDoctorPresence } from "@/lib/server/doctorCare";

async function verifiedDoctor(request: NextRequest) {
  if (!isAuthEnforced()) return { error: NextResponse.json({ success: false, error: "Doctor presence is unavailable" }, { status: 503 }) };
  const auth = await authenticateRequest(request);
  const failure = getAuthorizationFailure(auth);
  if (failure || auth.status !== "verified") return { error: NextResponse.json({ success: false, error: failure?.error || "Authentication required" }, { status: failure?.status || 401 }) };
  const access = await authorizeDoctor(auth);
  if (access.status !== "authorized" || access.role !== "doctor") return { error: NextResponse.json({ success: false, error: access.status === "unavailable" ? "Doctor verification is temporarily unavailable" : "Verified doctor access required" }, { status: access.status === "unavailable" ? 503 : 403 }) };
  return { auth };
}

export async function GET(request: NextRequest) {
  const identity = await verifiedDoctor(request);
  if (identity.error || !identity.auth) return identity.error;
  try {
    return NextResponse.json({ success: true, data: { status: await getDoctorPresence(identity.auth.uid) } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "Doctor presence could not be loaded" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const identity = await verifiedDoctor(request);
  if (identity.error || !identity.auth) return identity.error;
  const body = await request.json().catch(() => null) as { status?: string } | null;
  if (!body || !["available", "offline"].includes(body.status || "")) return NextResponse.json({ success: false, error: "Status must be available or offline" }, { status: 400 });
  try {
    const status = await updateDoctorPresence(identity.auth.uid, body.status as "available" | "offline");
    return NextResponse.json({ success: true, data: { status } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Presence update failed" }, { status: 409 });
  }
}

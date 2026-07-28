import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminDb, getAdminStorageBucket, hasRole, isAuthEnforced } from "@/lib/firebaseAdmin";

const SIGNED_URL_TTL_MS = 5 * 60 * 1000;

/** A reviewer receives one short-lived private KYC-document URL at a time. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Counsellor operations are unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified" || !hasRole(auth, "admin")) return NextResponse.json({ success: false, error: "Admin privileges required" }, { status: 403 });
  const { id } = await params;
  const index = Number(request.nextUrl.searchParams.get("index"));
  if (!Number.isInteger(index) || index < 0 || index > 4) return NextResponse.json({ success: false, error: "Invalid document index" }, { status: 400 });

  const application = await getAdminDb()!.collection("counsellorApplications").doc(id).get();
  const documents = application.data()?.documentReferences;
  const path = Array.isArray(documents) ? documents[index] : null;
  if (typeof path !== "string" || !new RegExp(`^counsellor-kyc/${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[^/]+$`).test(path)) {
    return NextResponse.json({ success: false, error: "Secure KYC document not found" }, { status: 404 });
  }
  const bucket = getAdminStorageBucket();
  if (!bucket) return NextResponse.json({ success: false, error: "Private document storage is unavailable" }, { status: 503 });
  const [url] = await bucket.file(path).getSignedUrl({ action: "read", expires: Date.now() + SIGNED_URL_TTL_MS });
  return NextResponse.json({ success: true, data: { url, expiresAt: new Date(Date.now() + SIGNED_URL_TTL_MS).toISOString() } });
}

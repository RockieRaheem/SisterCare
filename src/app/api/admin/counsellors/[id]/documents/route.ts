import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole, isAuthEnforced } from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const SIGNED_URL_TTL_SECONDS = 5 * 60;

/** Issue one short-lived URL for a private KYC object after admin authorization. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Counsellor operations are unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  if (!hasRole(auth, "admin")) return NextResponse.json({ success: false, error: "Admin privileges required" }, { status: 403 });
  const { id } = await params;
  const index = Number(request.nextUrl.searchParams.get("index"));
  if (!Number.isInteger(index) || index < 0 || index > 4) {
    return NextResponse.json({ success: false, error: "Invalid document index" }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  const { data: row, error } = await db.from("counsellor_applications")
    .select("application")
    .eq("counsellor_id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 503 });
  const application = row?.application as { documentReferences?: unknown } | undefined;
  const documents = application?.documentReferences;
  const path = Array.isArray(documents) ? documents[index] : null;
  if (typeof path !== "string" || !path.startsWith(`${id}/`) || path.includes("..")) {
    return NextResponse.json({ success: false, error: "Secure KYC document not found" }, { status: 404 });
  }
  const signed = await db.storage.from("counsellor-kyc").createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ success: false, error: signed.error?.message || "Private document storage is unavailable" }, { status: 503 });
  }
  return NextResponse.json({
    success: true,
    data: {
      url: signed.data.signedUrl,
      expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
    },
  });
}

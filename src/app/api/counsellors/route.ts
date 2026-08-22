import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthEnforced } from "@/lib/serverAuth";
import { getLiveCounsellors } from "@/lib/server/serverData";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCounsellorPhotoUrl } from "@/lib/server/counsellorPhotos";
import { getSafetyCoverageReadiness } from "@/lib/server/operations";

/** Authenticated member directory. Availability is calculated server-side. */
export async function GET(request: NextRequest) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Counsellor directory is unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  try {
    const safetyCoverageReady = await getSafetyCoverageReadiness();
    const verified = (await getLiveCounsellors()).filter(
      (counsellor) =>
        counsellor.verified &&
        counsellor.verificationStatus === "verified",
    );
    const db = getSupabaseAdmin();
    const counsellors = await Promise.all(
      verified.map(async (counsellor) => ({
        ...counsellor,
        status: safetyCoverageReady ? counsellor.status : "offline",
        photoURL: await resolveCounsellorPhotoUrl(
          db,
          counsellor.id,
          counsellor.photoURL,
        ),
        phoneNumber: "",
        whatsappNumber: "",
      })),
    );
    return NextResponse.json(
      { success: true, data: { counsellors, admissionsOpen: safetyCoverageReady, refreshedAt: new Date().toISOString() } },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Failed to load the counsellor directory:", error);
    return NextResponse.json(
      { success: false, error: "Counsellor availability could not be refreshed" },
      { status: 503 },
    );
  }
}

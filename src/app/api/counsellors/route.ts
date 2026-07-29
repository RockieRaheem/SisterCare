import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthEnforced } from "@/lib/serverAuth";
import { getLiveCounsellors } from "@/lib/server/serverData";

/** Authenticated member directory. Availability is calculated server-side. */
export async function GET(request: NextRequest) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Counsellor directory is unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  const counsellors = (await getLiveCounsellors()).filter((counsellor) => counsellor.verified && counsellor.verificationStatus === "verified");
  return NextResponse.json({ success: true, data: { counsellors } });
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, verifySupabaseAccessToken } from "@/lib/supabaseAdmin";

/**
 * Ensures the authenticated person's profile exists. Auth-user creation
 * normally invokes the database trigger, but this recovery path also covers
 * accounts created manually in the Supabase dashboard. It never accepts an id
 * from the client, nor can it set a privileged role.
 */
export async function POST(request: NextRequest) {
  const match = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!match) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const { user, error: authError } = await verifySupabaseAccessToken(match[1]);
    if (authError || !user) return NextResponse.json({ error: "Your Supabase session token was rejected. Sign out and sign in again." }, { status: 401 });
    const existing = await getSupabaseAdmin()
      .from("profiles")
      .select("registration_intent")
      .eq("id", user.id)
      .maybeSingle();
    const application = await getSupabaseAdmin()
      .from("counsellor_applications")
      .select("counsellor_id")
      .eq("counsellor_id", user.id)
      .maybeSingle();
    if (existing.error || application.error) throw existing.error || application.error;
    const registrationIntent =
      user.user_metadata.registration_intent === "counsellor" ||
      existing.data?.registration_intent === "counsellor" ||
      Boolean(application.data)
        ? "counsellor"
        : "member";
    const { error } = await getSupabaseAdmin().from("profiles").upsert({
      id: user.id,
      email: user.email || "",
      display_name: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : null,
      photo_url: typeof user.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null,
      registration_intent: registrationIntent,
    }, { onConflict: "id" });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile bootstrap failed:", error);
    return NextResponse.json({ error: "Authentication verification is temporarily unavailable" }, { status: 503 });
  }
}

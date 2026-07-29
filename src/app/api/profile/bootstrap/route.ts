import { NextRequest, NextResponse } from "next/server";
import { createSupabaseUserClient, getSupabaseAdmin } from "@/lib/supabaseAdmin";

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
    // Pass the bearer token explicitly. A server service-role client has no
    // browser session storage, so relying on its default auth context caused
    // valid newly-created users to receive a misleading 401 here.
    const { data: authData, error: authError } = await createSupabaseUserClient(match[1]).auth.getUser(match[1]);
    if (authError || !authData.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const user = authData.user;
    const registrationIntent = user.user_metadata.registration_intent === "counsellor" ? "counsellor" : "member";
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
    return NextResponse.json({ error: "Unable to initialize the account profile" }, { status: 503 });
  }
}

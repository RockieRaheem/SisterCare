import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole, isAuthEnforced, type UserRole } from "@/lib/firebaseAdmin";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveFirstAdminTarget } from "@/lib/adminBootstrap";

const roles: UserRole[] = ["user", "counsellor", "admin"];

/** Server-only role elevation. Browser profiles cannot update the role column. */
export async function POST(request: NextRequest) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Role management is unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  const body = await request.json().catch(() => null) as { role?: UserRole; uid?: string; email?: string } | null;
  if (!body || !body.role || !roles.includes(body.role)) return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
  if (auth.status === "unavailable") {
    const profileLookupFailed = auth.reason === "profile_lookup";
    return NextResponse.json({
      success: false,
      code: profileLookupFailed ? "SUPABASE_SERVICE_ACCESS_FAILED" : "SUPABASE_AUTH_VERIFIER_FAILED",
      error: profileLookupFailed
        ? "The server cannot read Supabase profiles. Verify that SUPABASE_SERVICE_ROLE_KEY is the secret key from the same Supabase project."
        : "The server cannot reach Supabase Auth. Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    }, { status: 503 });
  }
  if (auth.status !== "verified") return NextResponse.json({ success: false, error: "Your Supabase session token was rejected. Sign out and sign in again." }, { status: 401 });
  const db = getSupabaseAdmin();
  const { count, error: countError } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
  if (countError) return NextResponse.json({ success: false, error: "Could not verify administrator access" }, { status: 503 });
  const bootstrapSecretMatches = Boolean(process.env.ADMIN_BOOTSTRAP_SECRET && request.headers.get("x-admin-bootstrap-secret") === process.env.ADMIN_BOOTSTRAP_SECRET);
  const bootstrapTarget = resolveFirstAdminTarget({
    authenticatedUid: auth.uid,
    requestedRole: body.role,
    administratorCount: count || 0,
    bootstrapSecretMatches,
  });
  const existingAdmin = hasRole(auth, "admin");
  if (!existingAdmin && !bootstrapTarget) return NextResponse.json({ success: false, error: "Admin privileges required" }, { status: 403 });

  // Bootstrap always elevates the cryptographically verified caller. Email
  // lookup is reserved for an existing administrator assigning another user.
  let uid = bootstrapTarget || body.uid?.trim() || "";
  if (!uid && body.email?.trim()) {
    const { data, error: lookupError } = await db.from("profiles").select("id").eq("email", body.email.trim().toLowerCase()).maybeSingle();
    if (lookupError) return NextResponse.json({ success: false, error: "Could not find the requested account" }, { status: 503 });
    uid = data?.id || "";
  }
  if (!uid) return NextResponse.json({ success: false, error: "No user found with that email" }, { status: 404 });

  const role = body.role === "user" ? "member" : body.role;
  const result = bootstrapTarget
    ? await db
        .from("profiles")
        .upsert({
          id: uid,
          email: auth.token.email?.trim().toLowerCase() || body.email?.trim().toLowerCase() || "",
          role,
          registration_intent: "member",
        }, { onConflict: "id" })
        .select("id")
        .maybeSingle()
    : await db
        .from("profiles")
        .update({ role })
        .eq("id", uid)
        .select("id")
        .maybeSingle();
  const { data: updated, error } = result;
  if (error) return NextResponse.json({ success: false, error: "Failed to set role" }, { status: 503 });
  if (!updated) return NextResponse.json({ success: false, error: "Account profile unavailable" }, { status: 404 });
  await db.from("audit_events").insert({ actor_id: auth.status === "verified" ? auth.uid : null, event_type: "role.updated", subject_id: uid, metadata: { role, via: existingAdmin ? "admin" : "bootstrap" } });
  return NextResponse.json({ success: true, data: { uid, role, grantedVia: existingAdmin ? "admin" : "bootstrap" } });
}

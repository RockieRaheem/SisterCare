import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole, isAuthEnforced, type UserRole } from "@/lib/firebaseAdmin";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const roles: UserRole[] = ["user", "counsellor", "admin"];

/** Server-only role elevation. Browser profiles cannot update the role column. */
export async function POST(request: NextRequest) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Role management is unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  const body = await request.json().catch(() => null) as { role?: UserRole; uid?: string; email?: string } | null;
  if (!body || !body.role || !roles.includes(body.role)) return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
  const db = getSupabaseAdmin();
  let uid = body.uid?.trim() || "";
  if (!uid && body.email?.trim()) {
    const { data } = await db.from("profiles").select("id").eq("email", body.email.trim().toLowerCase()).maybeSingle();
    uid = data?.id || "";
  }
  if (!uid) return NextResponse.json({ success: false, error: "No user found with that email" }, { status: 404 });
  const { count, error: countError } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
  if (countError) return NextResponse.json({ success: false, error: "Could not verify administrator access" }, { status: 503 });
  const bootstrap = Boolean(process.env.ADMIN_BOOTSTRAP_SECRET && request.headers.get("x-admin-bootstrap-secret") === process.env.ADMIN_BOOTSTRAP_SECRET);
  const existingAdmin = hasRole(auth, "admin");
  if (!existingAdmin && !(bootstrap && auth.status === "verified" && uid === auth.uid && body.role === "admin" && (count || 0) === 0)) return NextResponse.json({ success: false, error: "Admin privileges required" }, { status: 403 });
  const role = body.role === "user" ? "member" : body.role;
  const { error } = await db.from("profiles").update({ role }).eq("id", uid);
  if (error) return NextResponse.json({ success: false, error: "Failed to set role" }, { status: 503 });
  await db.from("audit_events").insert({ actor_id: auth.status === "verified" ? auth.uid : null, event_type: "role.updated", subject_id: uid, metadata: { role, via: existingAdmin ? "admin" : "bootstrap" } });
  return NextResponse.json({ success: true, data: { uid, role, grantedVia: existingAdmin ? "admin" : "bootstrap" } });
}

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAuthorizationFailure, isAuthEnforced } from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { CareNotificationType } from "@/lib/careNotification";

async function authenticate(request: NextRequest) {
  if (!isAuthEnforced()) return null;
  const auth = await authenticateRequest(request);
  const failure = getAuthorizationFailure(auth);
  return failure || auth.status !== "verified" ? null : auth;
}

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  const { data, error } = await getSupabaseAdmin()
    .from("care_notifications")
    .select("id,session_id,event_type,created_at")
    .eq("recipient_id", auth.uid)
    .is("read_at", null)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) return NextResponse.json({ success: false, error: "Care updates could not be loaded" }, { status: 503 });
  return NextResponse.json({ success: true, data: { notifications: (data || []).map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    type: row.event_type as CareNotificationType,
    createdAt: row.created_at,
  })) } }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => null) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)).slice(0, 50)
    : [];
  if (!ids.length) return NextResponse.json({ success: false, error: "Notification identifiers required" }, { status: 400 });
  const { error } = await getSupabaseAdmin()
    .from("care_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", auth.uid)
    .in("id", ids);
  if (error) return NextResponse.json({ success: false, error: "Care updates could not be acknowledged" }, { status: 503 });
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getAuthorizationFailure,
  isAuthEnforced,
} from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_DAYS = new Set([7, 30, 90]);

const unavailable = () =>
  NextResponse.json(
    { success: false, error: "Physical symptom records are temporarily unavailable." },
    { status: 503 },
  );

type SymptomAuthorization =
  | { authorized: true; uid: string }
  | { authorized: false; response: NextResponse };

async function authorize(request: NextRequest): Promise<SymptomAuthorization> {
  if (!isAuthEnforced()) return { authorized: false, response: unavailable() };
  const auth = await authenticateRequest(request);
  const failure = getAuthorizationFailure(auth);
  if (failure) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: failure.error },
        { status: failure.status },
      ),
    };
  }
  if (auth.status !== "verified") {
    return { authorized: false, response: unavailable() };
  }
  return { authorized: true, uid: auth.uid };
}

function serialize(row: Record<string, unknown>) {
  const payload =
    row.payload && typeof row.payload === "object"
      ? (row.payload as Record<string, unknown>)
      : {};
  const dateValue = typeof payload.date === "string" ? payload.date : row.created_at;
  const date = new Date(String(dateValue || ""));
  if (Number.isNaN(date.getTime())) return null;
  const symptoms = Array.isArray(payload.symptoms)
    ? payload.symptoms
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 20)
    : [];
  const source = payload.source === "chat" || payload.source === "manual"
    ? payload.source
    : undefined;
  return {
    id: String(row.id),
    date: date.toISOString(),
    symptoms,
    source,
    createdAt: String(row.created_at || date.toISOString()),
  };
}

export async function GET(request: NextRequest) {
  const authorization = await authorize(request);
  if (!authorization.authorized) return authorization.response;
  const requestedDays = Number(request.nextUrl.searchParams.get("days") || 30);
  const days = ALLOWED_DAYS.has(requestedDays) ? requestedDays : 30;
  const cutoff = Date.now() - days * 86_400_000;

  const { data, error } = await getSupabaseAdmin()
    .from("user_records")
    .select("id,payload,created_at")
    .eq("user_id", authorization.uid)
    .eq("record_type", "symptom")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return unavailable();

  const symptoms = (data || [])
    .map((row) => serialize(row as Record<string, unknown>))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .filter((row) => new Date(row.date).getTime() >= cutoff);
  return NextResponse.json(
    { success: true, data: { symptoms, rangeDays: days } },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}

export async function DELETE(request: NextRequest) {
  const authorization = await authorize(request);
  if (!authorization.authorized) return authorization.response;
  const body = await request.json().catch(() => null);
  const ids = body && typeof body === "object" && Array.isArray((body as { ids?: unknown }).ids)
    ? [...new Set((body as { ids: unknown[] }).ids)]
    : [];
  if (
    ids.length === 0 ||
    ids.length > 20 ||
    !ids.every((id) => typeof id === "string" && UUID.test(id))
  ) {
    return NextResponse.json(
      { success: false, error: "Choose a valid symptom entry to remove." },
      { status: 400 },
    );
  }

  const database = getSupabaseAdmin();
  const { data: owned, error: lookupError } = await database
    .from("user_records")
    .select("id")
    .eq("user_id", authorization.uid)
    .eq("record_type", "symptom")
    .in("id", ids);
  if (lookupError) return unavailable();
  if ((owned || []).length !== ids.length) {
    return NextResponse.json(
      { success: false, error: "That symptom entry is no longer available." },
      { status: 404 },
    );
  }

  const { data: removed, error } = await database
    .from("user_records")
    .delete()
    .eq("user_id", authorization.uid)
    .eq("record_type", "symptom")
    .in("id", ids)
    .select("id");
  if (error) return unavailable();
  return NextResponse.json({
    success: true,
    data: { deleted: (removed || []).length },
  });
}

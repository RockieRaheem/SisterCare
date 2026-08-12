import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthEnforced } from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  normalizeWellbeingDate,
  parseWellbeingCheckIn,
} from "@/lib/wellbeing";

const unavailable = () =>
  NextResponse.json(
    { success: false, error: "Wellbeing check-ins are temporarily unavailable." },
    { status: 503 },
  );

const serialize = (row: Record<string, unknown>) => {
  const payload =
    row.payload && typeof row.payload === "object"
      ? (row.payload as Record<string, unknown>)
      : {};
  return {
    id: String(row.id),
    mood: Number(payload.mood),
    stress: Number(payload.stress),
    sleep: Number(payload.sleep),
    energy: Number(payload.energy),
    localDate:
      typeof payload.localDate === "string"
        ? payload.localDate
        : String(row.created_at).slice(0, 10),
    feelings: Array.isArray(payload.feelings) ? payload.feelings : [],
    contexts: Array.isArray(payload.contexts) ? payload.contexts : [],
    supportNeed:
      typeof payload.supportNeed === "string" ? payload.supportNeed : undefined,
    note: typeof payload.note === "string" ? payload.note : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export async function GET(request: NextRequest) {
  if (!isAuthEnforced()) return unavailable();
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  const { data, error } = await getSupabaseAdmin()
    .from("user_records")
    .select("id,payload,created_at,updated_at")
    .eq("user_id", auth.uid)
    .eq("record_type", "wellbeing")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return unavailable();
  return NextResponse.json(
    {
      success: true,
      data: { checkIns: (data || []).map((row) => serialize(row)) },
    },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}

export async function POST(request: NextRequest) {
  if (!isAuthEnforced()) return unavailable();
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }
  const body = await request.json().catch(() => null);
  const parsed = parseWellbeingCheckIn(body);
  const input = parsed
    ? {
        ...parsed,
        localDate: normalizeWellbeingDate(
          body && typeof body === "object"
            ? (body as Record<string, unknown>).localDate
            : undefined,
        ),
      }
    : null;
  if (!input) {
    return NextResponse.json(
      { success: false, error: "Choose one response for every wellbeing area." },
      { status: 400 },
    );
  }

  const idempotencyKey = request.headers.get("idempotency-key");
  if (
    idempotencyKey &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      idempotencyKey,
    )
  ) {
    return NextResponse.json(
      { success: false, error: "Invalid idempotency key." },
      { status: 400 },
    );
  }
  const db = getSupabaseAdmin();
  if (idempotencyKey) {
    const { data: existing, error: existingError } = await db
      .from("user_records")
      .select("id,payload,created_at,updated_at")
      .eq("user_id", auth.uid)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existingError) return unavailable();
    if (existing) {
      return NextResponse.json({
        success: true,
        data: { checkIn: serialize(existing), duplicate: true },
      });
    }
  }

  const { data: existingToday, error: existingTodayError } = await db
    .from("user_records")
    .select("id,payload,created_at,updated_at")
    .eq("user_id", auth.uid)
    .eq("record_type", "wellbeing")
    .eq("payload->>localDate", input.localDate)
    .maybeSingle();
  if (existingTodayError) return unavailable();
  if (existingToday) {
    const { data: updated, error: updateError } = await db
      .from("user_records")
      .update({ payload: input })
      .eq("id", existingToday.id)
      .eq("user_id", auth.uid)
      .select("id,payload,created_at,updated_at")
      .single();
    if (updateError || !updated) return unavailable();
    return NextResponse.json({
      success: true,
      data: { checkIn: serialize(updated), updated: true },
    });
  }
  const { data, error } = await db
    .from("user_records")
    .insert({
      user_id: auth.uid,
      record_type: "wellbeing",
      payload: input,
      idempotency_key: idempotencyKey || null,
    })
    .select("id,payload,created_at,updated_at")
    .single();
  if (error?.code === "23505") {
    return NextResponse.json(
      {
        success: false,
        error: "Today's check-in changed in another session. Refresh before editing it again.",
      },
      { status: 409 },
    );
  }
  if (error || !data) return unavailable();
  return NextResponse.json(
    { success: true, data: { checkIn: serialize(data) } },
    { status: 201 },
  );
}

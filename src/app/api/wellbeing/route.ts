import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeWellbeingDate,
  parseWellbeingCheckIn,
  wellbeingFeelingsFromPayload,
} from "@/lib/wellbeing";

const unavailable = () =>
  NextResponse.json(
    { success: false, error: "Wellbeing check-ins are temporarily unavailable." },
    { status: 503 },
  );

type WellbeingAuthorization =
  | { authorized: true; uid: string; database: SupabaseClient }
  | { authorized: false; response: NextResponse };

async function authorize(request: NextRequest): Promise<WellbeingAuthorization> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return { authorized: false, response: unavailable() };
  }
  const token = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      ),
    };
  }
  const database = createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  let verification;
  try {
    verification = await database.auth.getUser(token);
  } catch {
    return { authorized: false, response: unavailable() };
  }
  const { data, error } = verification;
  if (error || !data.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Your session is missing or expired. Please sign in again." },
        { status: 401 },
      ),
    };
  }
  return { authorized: true, uid: data.user.id, database };
}

const serialize = (row: Record<string, unknown>) => {
  const payload =
    row.payload && typeof row.payload === "object"
      ? (row.payload as Record<string, unknown>)
      : {};
  return {
    id: String(row.id),
    localDate:
      typeof payload.localDate === "string"
        ? payload.localDate
        : String(row.created_at).slice(0, 10),
    feelings: wellbeingFeelingsFromPayload(payload),
    contexts: Array.isArray(payload.contexts) ? payload.contexts : [],
    supportNeed:
      typeof payload.supportNeed === "string" ? payload.supportNeed : undefined,
    note: typeof payload.note === "string" ? payload.note : undefined,
    followUpAt: typeof payload.followUpAt === "string" ? payload.followUpAt : undefined,
    followUpDeliveredAt:
      typeof payload.followUpDeliveredAt === "string"
        ? payload.followUpDeliveredAt
        : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.authorized) return auth.response;

  const { data, error } = await auth.database
    .from("user_records")
    .select("id,payload,created_at,updated_at")
    .eq("user_id", auth.uid)
    .eq("record_type", "wellbeing")
    .order("created_at", { ascending: false })
    .limit(90);
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
  const auth = await authorize(request);
  if (!auth.authorized) return auth.response;
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
      { success: false, error: "Choose the feeling that is closest to today." },
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
  const db = auth.database;
  const { data: existingToday, error: existingTodayError } = await db
    .from("user_records")
    .select("id,payload,created_at,updated_at")
    .eq("user_id", auth.uid)
    .eq("record_type", "wellbeing")
    .eq("payload->>localDate", input.localDate)
    .order("updated_at", { ascending: false })
    .limit(1)
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

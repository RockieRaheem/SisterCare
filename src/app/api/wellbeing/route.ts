import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthEnforced } from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { parseWellbeingCheckIn } from "@/lib/wellbeing";

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
    note: typeof payload.note === "string" ? payload.note : undefined,
    createdAt: row.created_at,
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
    .select("id,payload,created_at")
    .eq("user_id", auth.uid)
    .eq("record_type", "wellbeing")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return unavailable();
  return NextResponse.json({
    success: true,
    data: { checkIns: (data || []).map((row) => serialize(row)) },
  });
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
  const input = parseWellbeingCheckIn(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json(
      { success: false, error: "Choose one response for every wellbeing area." },
      { status: 400 },
    );
  }

  const { data, error } = await getSupabaseAdmin()
    .from("user_records")
    .insert({ user_id: auth.uid, record_type: "wellbeing", payload: input })
    .select("id,payload,created_at")
    .single();
  if (error || !data) return unavailable();
  return NextResponse.json(
    { success: true, data: { checkIn: serialize(data) } },
    { status: 201 },
  );
}

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthEnforced } from "@/lib/serverAuth";
import { getSession } from "@/lib/server/sessions";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  AudioProviderUnavailableError,
  createAnonymousAudioJoin,
} from "@/lib/server/audioProvider";

const serialize = (row: Record<string, unknown> | null) =>
  row
    ? {
        id: row.id,
        state: row.state,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        durationSeconds: Number(row.duration_seconds || 0),
        failureCode: row.failure_code || undefined,
      }
    : null;

async function authorize(
  request: NextRequest,
  params: Promise<{ id: string }>,
) {
  if (!isAuthEnforced()) return { error: "Private audio is unavailable", status: 503 };
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") return { error: "Authentication required", status: 401 };
  const { id } = await params;
  const session = await getSession(id);
  if (!session) return { error: "Session not found", status: 404 };
  if (auth.uid !== session.userId && auth.uid !== session.counsellorId) {
    return { error: "Not a participant of this session", status: 403 };
  }
  return { auth, session, id };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await authorize(request, params);
  if ("error" in access) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }
  const { data, error } = await getSupabaseAdmin()
    .from("session_audio_calls")
    .select("*")
    .eq("session_id", access.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ success: false, error: "Audio state is unavailable" }, { status: 503 });
  }
  return NextResponse.json({ success: true, data: { call: serialize(data) } });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await authorize(request, params);
  if ("error" in access) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }
  const body = await request.json().catch(() => ({}));
  const action = body.action;
  const db = getSupabaseAdmin();

  try {
    if (action === "join") {
      if (access.session.state !== "active") {
        return NextResponse.json(
          { success: false, error: "Audio is available only during an active session." },
          { status: 409 },
        );
      }
      if (body.microphoneConsent !== true) {
        return NextResponse.json(
          { success: false, error: "Microphone consent is required for this call." },
          { status: 400 },
        );
      }
      const participantRole =
        access.auth.uid === access.session.userId ? "member" : "counsellor";
      const join = await createAnonymousAudioJoin({
        sessionId: access.id,
        participantId: access.auth.uid,
        participantRole,
      });
      const { data, error } = await db
        .from("session_audio_calls")
        .upsert(
          {
            session_id: access.id,
            state: "connecting",
            initiated_by: access.auth.uid,
            provider_room_id: join.providerRoomId,
            failure_code: null,
            ended_at: null,
          },
          { onConflict: "session_id" },
        )
        .select("*")
        .single();
      if (error || !data) throw error || new Error("Call state was not created");
      return NextResponse.json({
        success: true,
        data: { call: serialize(data), joinUrl: join.joinUrl },
      });
    }

    const { data: existing, error: readError } = await db
      .from("session_audio_calls")
      .select("*")
      .eq("session_id", access.id)
      .maybeSingle();
    if (readError || !existing) {
      return NextResponse.json({ success: false, error: "No audio call exists." }, { status: 404 });
    }

    if (action === "connected") {
      const { data, error } = await db
        .from("session_audio_calls")
        .update({ state: "active", started_at: existing.started_at || new Date().toISOString() })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, data: { call: serialize(data) } });
    }

    if (action === "end" || action === "fail") {
      const endedAt = new Date();
      const startedAt = existing.started_at ? new Date(existing.started_at) : null;
      const durationSeconds = startedAt
        ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000))
        : 0;
      const { data, error } = await db
        .from("session_audio_calls")
        .update({
          state: action === "end" ? "ended" : "failed",
          ended_at: endedAt.toISOString(),
          duration_seconds: durationSeconds,
          failure_code:
            action === "fail" && typeof body.failureCode === "string"
              ? body.failureCode.slice(0, 80)
              : null,
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, data: { call: serialize(data) } });
    }

    return NextResponse.json({ success: false, error: "Unsupported audio action" }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof AudioProviderUnavailableError
        ? error.message
        : "The private audio connection could not be prepared.";
    return NextResponse.json(
      { success: false, error: message, fallback: "text" },
      { status: error instanceof AudioProviderUnavailableError ? 503 : 500 },
    );
  }
}

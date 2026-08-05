import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthEnforced } from "@/lib/serverAuth";
import { getSession } from "@/lib/server/sessions";
import {
  createSessionParticipantJoin,
  DailyProviderUnavailableError,
  finishSessionAudio,
  markSessionAudioConnected,
  markSessionAudioDisconnected,
  serializeSessionAudioCall,
  SessionAudioStorageError,
} from "@/lib/server/sessionAudio";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type ParticipantRole = "member" | "counsellor";

const privateJson = (
  body: Record<string, unknown>,
  init?: { status?: number },
) =>
  NextResponse.json(body, {
    ...init,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });

async function authorize(
  request: NextRequest,
  params: Promise<{ id: string }>,
) {
  if (!isAuthEnforced()) {
    return { error: "Private audio is unavailable", status: 503 };
  }
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") {
    return { error: "Authentication required", status: 401 };
  }
  const { id } = await params;
  const session = await getSession(id);
  if (!session) return { error: "Session not found", status: 404 };
  if (auth.uid !== session.userId && auth.uid !== session.counsellorId) {
    return { error: "Not a participant of this session", status: 403 };
  }
  const participantRole: ParticipantRole =
    auth.uid === session.userId ? "member" : "counsellor";
  return { auth, session, id, participantRole };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await authorize(request, params);
  if ("error" in access) {
    return privateJson(
      { success: false, error: access.error },
      { status: access.status },
    );
  }
  const { data, error } = await getSupabaseAdmin()
    .from("session_audio_calls")
    .select("*")
    .eq("session_id", access.id)
    .maybeSingle();
  if (error) {
    return privateJson(
      { success: false, error: "Audio state is unavailable" },
      { status: 503 },
    );
  }
  return privateJson({
    success: true,
    data: {
      call: serializeSessionAudioCall(data, access.participantRole),
      canJoin: access.session.state === "active",
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await authorize(request, params);
  if ("error" in access) {
    return privateJson(
      { success: false, error: access.error },
      { status: access.status },
    );
  }
  const body = await request.json().catch(() => ({}));
  const action = body.action;

  try {
    if (action === "join") {
      if (access.session.state !== "active") {
        return privateJson(
          {
            success: false,
            error: "Audio is available only during an active session.",
          },
          { status: 409 },
        );
      }
      if (body.microphoneConsent !== true) {
        return privateJson(
          {
            success: false,
            error: "Microphone consent is required for this call.",
          },
          { status: 400 },
        );
      }
      const join = await createSessionParticipantJoin({
        sessionId: access.id,
        participantId: access.auth.uid,
        participantRole: access.participantRole,
      });
      return privateJson({
        success: true,
        data: {
          call: serializeSessionAudioCall(
            join.call,
            access.participantRole,
          ),
          roomUrl: join.roomUrl,
          token: join.token,
        },
      });
    }

    if (action === "connected") {
      const call = await markSessionAudioConnected(
        access.id,
        access.participantRole,
      );
      return privateJson({
        success: true,
        data: {
          call: serializeSessionAudioCall(call, access.participantRole),
        },
      });
    }

    if (action === "leave" || action === "fail") {
      const call = await markSessionAudioDisconnected(
        access.id,
        access.participantRole,
        action === "fail" && typeof body.failureCode === "string"
          ? body.failureCode
          : undefined,
      );
      return privateJson({
        success: true,
        data: {
          call: serializeSessionAudioCall(call, access.participantRole),
        },
      });
    }

    if (action === "end") {
      await finishSessionAudio(access.id);
      return privateJson({ success: true });
    }

    return privateJson(
      { success: false, error: "Unsupported audio action" },
      { status: 400 },
    );
  } catch (error) {
    const message =
      error instanceof DailyProviderUnavailableError
        ? error.message
        : error instanceof SessionAudioStorageError
          ? error.message
        : error instanceof Error &&
            (error.message.includes("already ended") ||
              error.message.includes("No audio call"))
          ? error.message
          : "The private audio connection could not be prepared.";
    const status =
      error instanceof DailyProviderUnavailableError ||
      error instanceof SessionAudioStorageError
        ? 503
        : message.includes("already ended")
          ? 409
          : message.includes("No audio call")
            ? 404
            : 500;
    if (status === 500) console.error("Private audio request failed:", error);
    const code =
      error instanceof DailyProviderUnavailableError
        ? error.code
        : error instanceof SessionAudioStorageError
          ? error.code
          : undefined;
    return privateJson(
      { success: false, error: message, code, fallback: "text" },
      { status },
    );
  }
}

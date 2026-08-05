import { getSupabaseAdmin } from "../supabaseAdmin";
import {
  createPrivateDailyJoin,
  createPrivateDailyRoom,
  DailyProviderUnavailableError,
  deletePrivateDailyRoom,
} from "./dailyProvider";

type AudioCallState =
  | "ready"
  | "connecting"
  | "active"
  | "disconnected"
  | "ended"
  | "failed"
  | "cancelled"
  | "expired";
type ParticipantRole = "member" | "counsellor";
type Row = Record<string, unknown>;

export class SessionAudioStorageError extends Error {
  constructor(
    public readonly code:
      | "audio_schema_missing"
      | "audio_storage_unavailable",
  ) {
    super(
      code === "audio_schema_missing"
        ? "Private audio storage requires the latest database migration."
        : "Private audio state is temporarily unavailable.",
    );
    this.name = "SessionAudioStorageError";
  }
}

const LIVE_CALL_STATES: AudioCallState[] = [
  "ready",
  "connecting",
  "active",
  "disconnected",
];

const db = () => getSupabaseAdmin();
const nowIso = () => new Date().toISOString();

export function classifyAudioStorageError(error: unknown) {
  if (!error || typeof error !== "object") {
    return new SessionAudioStorageError("audio_storage_unavailable");
  }
  const value = error as { code?: unknown; message?: unknown };
  const message =
    typeof value.message === "string" ? value.message.toLowerCase() : "";
  const schemaMissing =
    value.code === "42P01" ||
    value.code === "42703" ||
    message.includes("session_audio_calls") &&
      (message.includes("does not exist") ||
        message.includes("schema cache") ||
        message.includes("column")) ||
    message.includes("session_audio_calls_state_check");
  return new SessionAudioStorageError(
    schemaMissing ? "audio_schema_missing" : "audio_storage_unavailable",
  );
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isConnected(row: Row, role: ParticipantRole): boolean {
  const joined = asDate(row[`${role}_joined_at`]);
  const left = asDate(row[`${role}_left_at`]);
  return Boolean(joined && !left);
}

export function serializeSessionAudioCall(
  row: Row | null,
  role: ParticipantRole,
) {
  if (!row) return null;
  const otherRole = role === "member" ? "counsellor" : "member";
  return {
    id: row.id,
    state: row.state,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    expiresAt: row.room_expires_at,
    durationSeconds: Number(row.duration_seconds || 0),
    failureCode: row.failure_code || undefined,
    currentParticipantConnected: isConnected(row, role),
    otherParticipantConnected: isConnected(row, otherRole),
  };
}

async function readAudioCall(sessionId: string): Promise<Row | null> {
  const { data, error } = await db()
    .from("session_audio_calls")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw classifyAudioStorageError(error);
  return data as Row | null;
}

export async function ensureSessionAudioRoom(params: {
  sessionId: string;
  initiatedBy: string;
}): Promise<Row> {
  const existing = await readAudioCall(params.sessionId);
  const existingExpiry = asDate(existing?.room_expires_at);
  if (
    existing &&
    LIVE_CALL_STATES.includes(existing.state as AudioCallState) &&
    existingExpiry &&
    existingExpiry.getTime() > Date.now() + 60_000
  ) {
    return existing;
  }

  if (existing?.provider_room_id) {
    await deletePrivateDailyRoom(String(existing.provider_room_id)).catch(
      () => undefined,
    );
  }
  const room = await createPrivateDailyRoom({ sessionId: params.sessionId });
  const { data, error } = await db()
    .from("session_audio_calls")
    .upsert(
      {
        session_id: params.sessionId,
        state: "ready",
        initiated_by: params.initiatedBy,
        provider_room_id: room.roomName,
        room_expires_at: room.expiresAt.toISOString(),
        started_at: null,
        ended_at: null,
        duration_seconds: 0,
        failure_code: null,
        member_joined_at: null,
        member_left_at: null,
        counsellor_joined_at: null,
        counsellor_left_at: null,
      },
      { onConflict: "session_id" },
    )
    .select("*")
    .single();
  if (error || !data) {
    await deletePrivateDailyRoom(room.roomName).catch(() => undefined);
    if (error) throw classifyAudioStorageError(error);
    throw new SessionAudioStorageError("audio_storage_unavailable");
  }
  return data as Row;
}

export async function createSessionParticipantJoin(params: {
  sessionId: string;
  participantId: string;
  participantRole: ParticipantRole;
}): Promise<{ call: Row; roomUrl: string; token: string }> {
  const call = await ensureSessionAudioRoom({
    sessionId: params.sessionId,
    initiatedBy: params.participantId,
  });
  const expiresAt = asDate(call.room_expires_at);
  if (!expiresAt) {
    throw new DailyProviderUnavailableError(
      "The private audio room has no safe expiry time.",
    );
  }
  const access = await createPrivateDailyJoin({
    roomName: String(call.provider_room_id),
    participantId: params.participantId,
    participantRole: params.participantRole,
    expiresAt,
  });
  return { call, ...access };
}

export async function markSessionAudioConnected(
  sessionId: string,
  role: ParticipantRole,
): Promise<Row> {
  const existing = await readAudioCall(sessionId);
  if (!existing) throw new Error("No audio call exists");
  if (!LIVE_CALL_STATES.includes(existing.state as AudioCallState)) {
    throw new Error("This audio call has already ended");
  }
  const otherRole = role === "member" ? "counsellor" : "member";
  const bothConnected = isConnected(existing, otherRole);
  const update: Row = {
    state: bothConnected ? "active" : "connecting",
    [`${role}_joined_at`]: nowIso(),
    [`${role}_left_at`]: null,
    failure_code: null,
  };
  if (bothConnected && !existing.started_at) update.started_at = nowIso();
  const { data, error } = await db()
    .from("session_audio_calls")
    .update(update)
    .eq("id", existing.id)
    .in("state", LIVE_CALL_STATES)
    .select("*")
    .maybeSingle();
  if (error) throw classifyAudioStorageError(error);
  if (!data) throw new Error("This audio call has already ended");
  const updated = data as Row;
  if (
    isConnected(updated, "member") &&
    isConnected(updated, "counsellor") &&
    updated.state !== "active"
  ) {
    const { data: active, error: activeError } = await db()
      .from("session_audio_calls")
      .update({
        state: "active",
        started_at: updated.started_at || nowIso(),
      })
      .eq("id", updated.id)
      .in("state", ["connecting", "disconnected", "ready"])
      .select("*")
      .maybeSingle();
    if (activeError) throw classifyAudioStorageError(activeError);
    if (active) return active as Row;
  }
  return updated;
}

export async function markSessionAudioDisconnected(
  sessionId: string,
  role: ParticipantRole,
  failureCode?: string,
): Promise<Row> {
  const existing = await readAudioCall(sessionId);
  if (!existing) throw new Error("No audio call exists");
  if (!LIVE_CALL_STATES.includes(existing.state as AudioCallState)) {
    return existing;
  }
  const { data, error } = await db()
    .from("session_audio_calls")
    .update({
      state: "disconnected",
      [`${role}_left_at`]: nowIso(),
      failure_code: failureCode?.slice(0, 80) || null,
    })
    .eq("id", existing.id)
    .in("state", LIVE_CALL_STATES)
    .select("*")
    .maybeSingle();
  if (error) throw classifyAudioStorageError(error);
  return (data || existing) as Row;
}

export async function finishSessionAudio(
  sessionId: string,
  state: "ended" | "cancelled" | "expired" = "ended",
): Promise<void> {
  const existing = await readAudioCall(sessionId);
  if (!existing) return;
  const endedAt = new Date();
  const startedAt = asDate(existing.started_at);
  const durationSeconds = startedAt
    ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000))
    : 0;
  const { error } = await db()
    .from("session_audio_calls")
    .update({
      state,
      ended_at: endedAt.toISOString(),
      duration_seconds: durationSeconds,
    })
    .eq("id", existing.id)
    .in("state", LIVE_CALL_STATES);
  if (error) throw classifyAudioStorageError(error);
  if (existing.provider_room_id) {
    await deletePrivateDailyRoom(String(existing.provider_room_id)).catch(
      () => undefined,
    );
  }
}

export { DailyProviderUnavailableError };

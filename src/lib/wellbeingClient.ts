"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import {
  normalizeWellbeingDate,
  parseWellbeingCheckIn,
  wellbeingFeelingsFromPayload,
  type WellbeingCheckInInput,
} from "@/lib/wellbeing";
import { submitOfflineCapableWrite } from "@/lib/offlineQueue";
import type { WellbeingCheckIn } from "@/types";

type WellbeingRow = {
  id: string;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const fromRow = (row: WellbeingRow): WellbeingCheckIn => ({
  id: row.id,
  localDate: typeof row.payload.localDate === "string" ? row.payload.localDate : row.created_at.slice(0, 10),
  feelings: wellbeingFeelingsFromPayload(row.payload),
  contexts: Array.isArray(row.payload.contexts) ? row.payload.contexts as WellbeingCheckIn["contexts"] : [],
  supportNeed: typeof row.payload.supportNeed === "string" ? row.payload.supportNeed as WellbeingCheckIn["supportNeed"] : undefined,
  note: typeof row.payload.note === "string" ? row.payload.note : undefined,
  followUpAt: typeof row.payload.followUpAt === "string" ? row.payload.followUpAt : undefined,
  followUpDeliveredAt: typeof row.payload.followUpDeliveredAt === "string" ? row.payload.followUpDeliveredAt : undefined,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

function databaseError(action: "load" | "save", error: { code?: string; message?: string } | null): Error {
  if (error?.code === "42501") {
    return new Error("Your signed-in session could not access this private check-in. Please sign in again.");
  }
  if (error?.code === "23514" || error?.code === "42703") {
    return new Error("Private check-ins are temporarily unavailable while SisterCare completes a storage update. Please try again shortly.");
  }
  return new Error(error?.message || `Could not ${action} your wellbeing check-in.`);
}

async function verifyOwner(uid: string) {
  const database = getSupabaseBrowserClient();
  const { data, error } = await database.auth.getSession();
  if (error || !data.session || data.session.user.id !== uid) {
    throw new Error("Your session is missing or expired. Please sign in again.");
  }
  return database;
}

export async function getWellbeingCheckIns(uid: string): Promise<WellbeingCheckIn[]> {
  const database = await verifyOwner(uid);
  const { data, error } = await database
    .from("user_records")
    .select("id,payload,created_at,updated_at")
    .eq("user_id", uid)
    .eq("record_type", "wellbeing")
    .order("created_at", { ascending: false })
    .limit(90);
  if (error) throw databaseError("load", error);
  return ((data || []) as WellbeingRow[]).map(fromRow);
}

export async function saveWellbeingCheckIn(
  uid: string,
  value: WellbeingCheckInInput,
): Promise<WellbeingCheckIn> {
  const database = await verifyOwner(uid);
  const parsed = parseWellbeingCheckIn(value);
  if (!parsed) throw new Error("Choose the feeling that is closest to today.");
  const payload = {
    ...parsed,
    localDate: normalizeWellbeingDate(value.localDate),
  };
  const { data: existing, error: lookupError } = await database
    .from("user_records")
    .select("id,payload,created_at,updated_at")
    .eq("user_id", uid)
    .eq("record_type", "wellbeing")
    .eq("payload->>localDate", payload.localDate)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lookupError) throw databaseError("save", lookupError);

  if (existing) {
    const { data, error } = await database
      .from("user_records")
      .update({ payload })
      .eq("id", existing.id)
      .eq("user_id", uid)
      .select("id,payload,created_at,updated_at")
      .single();
    if (error || !data) throw databaseError("save", error);
    return fromRow(data as WellbeingRow);
  }

  const { data, error } = await database
    .from("user_records")
    .insert({ user_id: uid, record_type: "wellbeing", payload })
    .select("id,payload,created_at,updated_at")
    .single();
  if (error || !data) throw databaseError("save", error);
  return fromRow(data as WellbeingRow);
}

const isConnectionFailure = (error: unknown) =>
  error instanceof Error && /fetch|network|offline|load failed/i.test(error.message);

export async function submitWellbeingCheckIn(
  uid: string,
  value: WellbeingCheckInInput,
): Promise<
  | { state: "synced"; checkIn: WellbeingCheckIn }
  | { state: "queued"; localId: string; reason: "offline" | "connection" | "service" }
> {
  if (navigator.onLine) {
    try {
      return { state: "synced", checkIn: await saveWellbeingCheckIn(uid, value) };
    } catch (error) {
      if (!isConnectionFailure(error)) throw error;
    }
  }
  const queued = await submitOfflineCapableWrite({
    userId: uid,
    url: "/api/wellbeing",
    body: value,
  });
  return queued.state === "synced"
    ? { state: "synced", checkIn: fromApiPayload(queued.payload) }
    : queued;
}

function fromApiPayload(payload: Record<string, unknown>): WellbeingCheckIn {
  const data = payload.data as { checkIn?: WellbeingCheckIn } | undefined;
  if (!data?.checkIn) throw new Error("SisterCare did not return the saved check-in.");
  return {
    ...data.checkIn,
    createdAt: new Date(data.checkIn.createdAt),
    updatedAt: data.checkIn.updatedAt ? new Date(data.checkIn.updatedAt) : undefined,
  };
}

export async function markWellbeingFollowUpDelivered(
  uid: string,
  checkIn: WellbeingCheckIn,
): Promise<WellbeingCheckIn> {
  return saveWellbeingCheckIn(uid, {
    localDate: checkIn.localDate,
    feelings: checkIn.feelings,
    contexts: checkIn.contexts,
    supportNeed: checkIn.supportNeed,
    note: checkIn.note,
    followUpAt: checkIn.followUpAt,
    followUpDeliveredAt: new Date().toISOString(),
  });
}

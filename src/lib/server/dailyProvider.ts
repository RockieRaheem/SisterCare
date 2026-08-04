import { createHmac } from "crypto";

const DAILY_API_BASE = "https://api.daily.co/v1";
export const DAILY_ROOM_LIFETIME_SECONDS = 90 * 60;

interface DailyRoomResponse {
  name?: unknown;
  url?: unknown;
  config?: {
    exp?: unknown;
  };
}

interface DailyTokenResponse {
  token?: unknown;
}

export class DailyProviderUnavailableError extends Error {}

function opaqueId(scope: string, value: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${scope}:${value}`)
    .digest("hex")
    .slice(0, 32);
}

export function normalizeDailyDomain(value: string): string {
  const trimmed = value.trim();
  const parsed = new URL(
    trimmed.includes("://") ? trimmed : `https://${trimmed}`,
  );
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    (parsed.pathname !== "/" && parsed.pathname !== "") ||
    parsed.search ||
    parsed.hash
  ) {
    throw new DailyProviderUnavailableError(
      "The Daily domain configuration is invalid.",
    );
  }
  return parsed.hostname.toLowerCase();
}

function getDailyConfig() {
  const apiKey = process.env.DAILY_API_KEY?.trim();
  const domainValue = process.env.DAILY_DOMAIN?.trim();
  if (!apiKey || !domainValue) {
    throw new DailyProviderUnavailableError(
      "Private audio is not configured yet. Continue by text or try again later.",
    );
  }
  return {
    apiKey,
    domain: normalizeDailyDomain(domainValue),
  };
}

export function dailyRoomName(sessionId: string, apiKey: string): string {
  return `sc-${opaqueId("room", sessionId, apiKey)}`;
}

export function validateDailyRoomUrl(
  value: unknown,
  expectedDomain: string,
  expectedRoomName: string,
): string {
  if (typeof value !== "string") {
    throw new Error("Daily returned no room URL");
  }
  const url = new URL(value);
  const roomName = decodeURIComponent(url.pathname.replace(/^\/+|\/+$/g, ""));
  if (
    url.protocol !== "https:" ||
    url.hostname.toLowerCase() !== expectedDomain.toLowerCase() ||
    roomName !== expectedRoomName ||
    url.username ||
    url.password
  ) {
    throw new Error("Daily returned an untrusted room URL");
  }
  url.search = "";
  url.hash = "";
  return url.toString();
}

async function dailyRequest<T>(
  path: string,
  init: RequestInit,
  apiKey: string,
  allowedStatuses: number[] = [],
): Promise<{ response: Response; payload: T | null }> {
  let response: Response;
  try {
    response = await fetch(`${DAILY_API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...init.headers,
      },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    throw new DailyProviderUnavailableError(
      "The private audio service could not be reached. Continue by text or try again.",
    );
  }
  const payload = (await response.json().catch(() => null)) as T | null;
  if (!response.ok && !allowedStatuses.includes(response.status)) {
    throw new DailyProviderUnavailableError(
      response.status === 401 || response.status === 403
        ? "The private audio service credentials were rejected."
        : "The private audio room could not be prepared. Continue by text or try again.",
    );
  }
  return { response, payload };
}

function roomExpiry(payload: DailyRoomResponse | null, fallback: Date): Date {
  const seconds = Number(payload?.config?.exp);
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000)
    : fallback;
}

export async function createPrivateDailyRoom(params: {
  sessionId: string;
  now?: Date;
}): Promise<{ roomName: string; roomUrl: string; expiresAt: Date }> {
  const { apiKey, domain } = getDailyConfig();
  const now = params.now || new Date();
  const requestedExpiry = new Date(
    now.getTime() + DAILY_ROOM_LIFETIME_SECONDS * 1000,
  );
  const roomName = dailyRoomName(params.sessionId, apiKey);

  const existing = await dailyRequest<DailyRoomResponse>(
    `/rooms/${encodeURIComponent(roomName)}`,
    { method: "GET" },
    apiKey,
    [404],
  );
  if (existing.response.ok && existing.payload) {
    const expiresAt = roomExpiry(existing.payload, requestedExpiry);
    if (expiresAt.getTime() > now.getTime() + 60_000) {
      return {
        roomName,
        roomUrl: validateDailyRoomUrl(existing.payload.url, domain, roomName),
        expiresAt,
      };
    }
    await dailyRequest(
      `/rooms/${encodeURIComponent(roomName)}`,
      { method: "DELETE" },
      apiKey,
      [404],
    );
  }

  const created = await dailyRequest<DailyRoomResponse>(
    "/rooms",
    {
      method: "POST",
      body: JSON.stringify({
        name: roomName,
        privacy: "private",
        properties: {
          exp: Math.floor(requestedExpiry.getTime() / 1000),
          eject_at_room_exp: true,
          max_participants: 2,
          enable_prejoin_ui: false,
          enable_knocking: false,
          start_video_off: true,
          start_audio_off: false,
          enable_screenshare: false,
          enable_chat: false,
          enable_people_ui: false,
          enable_breakout_rooms: false,
          enable_emoji_reactions: false,
          enable_hand_raising: false,
          enable_pip_ui: false,
          enable_live_captions_ui: false,
          enable_network_ui: false,
          enable_video_processing_ui: false,
          permissions: {
            hasPresence: true,
            canSend: ["audio"],
            canReceive: { base: true },
            canAdmin: false,
          },
        },
      }),
    },
    apiKey,
  );
  if (!created.payload) {
    throw new DailyProviderUnavailableError(
      "The private audio room could not be prepared.",
    );
  }
  return {
    roomName,
    roomUrl: validateDailyRoomUrl(created.payload.url, domain, roomName),
    expiresAt: roomExpiry(created.payload, requestedExpiry),
  };
}

export async function createPrivateDailyJoin(params: {
  roomName: string;
  participantId: string;
  participantRole: "member" | "counsellor";
  expiresAt: Date;
}): Promise<{ roomUrl: string; token: string }> {
  const { apiKey, domain } = getDailyConfig();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const roomExpirySeconds = Math.floor(params.expiresAt.getTime() / 1000);
  if (roomExpirySeconds <= nowSeconds + 30) {
    throw new DailyProviderUnavailableError(
      "This private audio room has expired. Please prepare a new call.",
    );
  }
  const participantKey = `sc_${opaqueId(
    params.participantRole,
    params.participantId,
    apiKey,
  )}`;
  const created = await dailyRequest<DailyTokenResponse>(
    "/meeting-tokens",
    {
      method: "POST",
      body: JSON.stringify({
        properties: {
          room_name: params.roomName,
          exp: roomExpirySeconds,
          eject_at_token_exp: true,
          is_owner: false,
          user_id: participantKey,
          user_name:
            params.participantRole === "member" ? "Member" : "Counsellor",
          enable_screenshare: false,
          start_video_off: true,
          start_audio_off: false,
          enable_prejoin_ui: false,
          enable_live_captions_ui: false,
          enable_recording_ui: false,
          start_cloud_recording: false,
          auto_start_transcription: false,
          permissions: {
            hasPresence: true,
            canSend: ["audio"],
            canReceive: { base: true },
            canAdmin: false,
          },
        },
      }),
    },
    apiKey,
  );
  if (typeof created.payload?.token !== "string" || !created.payload.token) {
    throw new DailyProviderUnavailableError(
      "The private audio access pass could not be prepared.",
    );
  }
  return {
    roomUrl: `https://${domain}/${encodeURIComponent(params.roomName)}`,
    token: created.payload.token,
  };
}

export async function deletePrivateDailyRoom(roomName: string): Promise<void> {
  const { apiKey } = getDailyConfig();
  await dailyRequest(
    `/rooms/${encodeURIComponent(roomName)}`,
    { method: "DELETE" },
    apiKey,
    [404],
  );
}

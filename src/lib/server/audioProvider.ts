import { createHmac } from "crypto";

export class AudioProviderUnavailableError extends Error {}

function opaqueId(scope: string, value: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${scope}:${value}`)
    .digest("hex")
    .slice(0, 32);
}

export function validateAudioJoinUrl(value: unknown, allowedHost: string): string {
  if (typeof value !== "string") throw new Error("Audio provider returned no join URL");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== allowedHost) {
    throw new Error("Audio provider returned an untrusted join URL");
  }
  return url.toString();
}

export async function createAnonymousAudioJoin(params: {
  sessionId: string;
  participantId: string;
  participantRole: "member" | "counsellor";
}): Promise<{ joinUrl: string; providerRoomId: string }> {
  const endpoint = process.env.AUDIO_PROVIDER_TOKEN_ENDPOINT?.trim();
  const providerSecret = process.env.AUDIO_PROVIDER_SECRET?.trim();
  const allowedHost = process.env.AUDIO_PROVIDER_ALLOWED_HOST?.trim();
  if (!endpoint || !providerSecret || !allowedHost) {
    throw new AudioProviderUnavailableError(
      "Private audio is not configured yet. Continue by text or arrange another time.",
    );
  }
  const endpointUrl = new URL(endpoint);
  if (endpointUrl.protocol !== "https:") {
    throw new AudioProviderUnavailableError("Private audio provider configuration is unsafe.");
  }

  const roomKey = opaqueId("room", params.sessionId, providerSecret);
  const participantKey = opaqueId(
    "participant",
    params.participantId,
    providerSecret,
  );
  const response = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${providerSecret}`,
    },
    body: JSON.stringify({
      roomKey,
      participantKey,
      participantRole: params.participantRole,
      media: { audio: true, video: false, recording: false },
    }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AudioProviderUnavailableError(
      "The private audio connection could not be prepared.",
    );
  }
  return {
    joinUrl: validateAudioJoinUrl(payload.joinUrl, allowedHost),
    providerRoomId:
      typeof payload.roomId === "string" && payload.roomId.trim()
        ? payload.roomId.trim().slice(0, 200)
        : roomKey,
  };
}

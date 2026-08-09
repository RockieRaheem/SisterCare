import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAuthorizationFailure } from "@/lib/serverAuth";
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguageCode,
} from "@/lib/sunbird";
import {
  MAX_VOICE_RECORDING_SECONDS,
  MAX_VOICE_UPLOAD_BYTES,
  MIN_VOICE_RECORDING_BYTES,
  MIN_VOICE_RECORDING_MS,
} from "@/lib/speechCapture";
import {
  NoSpeechDetectedError,
  transcribeSpeech,
} from "@/lib/speechTranscription";
import { consumeRateLimit } from "@/lib/server/rateLimit";
import { logOperationalEvent, withApiObservability } from "@/lib/observability";

export const runtime = "nodejs";
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
]);

async function postTranscription(request: NextRequest) {
  const auth = await authenticateRequest(request);
  const authorizationFailure = getAuthorizationFailure(auth);
  if (authorizationFailure) {
    return NextResponse.json(
      { success: false, error: authorizationFailure.error },
      { status: authorizationFailure.status },
    );
  }

  const identity =
    auth.status === "verified"
      ? auth.uid
      : (request.headers.get("x-forwarded-for") || "development").split(",")[0].trim();
  const quota = await consumeRateLimit("voice-transcription", identity, 20, 60_000);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many voice messages were submitted. Please wait a moment and try again.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(quota.retryAfterSeconds) },
      },
    );
  }

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  const languageValue = String(form?.get("language") || "lug").toLowerCase();
  const durationMs = Number(form?.get("durationMs"));
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json(
      { success: false, error: "An audio recording is required." },
      { status: 400 },
    );
  }
  if (audio.size > MAX_VOICE_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        success: false,
        error: "The recording is too large. Keep voice messages under one minute.",
      },
      { status: 413 },
    );
  }
  if (
    audio.size < MIN_VOICE_RECORDING_BYTES ||
    !Number.isFinite(durationMs) ||
    durationMs < MIN_VOICE_RECORDING_MS
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "I could not hear enough speech. Hold the microphone button a little longer and try again.",
      },
      { status: 400 },
    );
  }
  if (durationMs > (MAX_VOICE_RECORDING_SECONDS + 5) * 1_000) {
    return NextResponse.json(
      { success: false, error: "Voice messages must be one minute or shorter." },
      { status: 413 },
    );
  }
  const contentType = audio.type.split(";")[0].toLowerCase();
  if (contentType && !ALLOWED_AUDIO_TYPES.has(contentType)) {
    return NextResponse.json(
      { success: false, error: "This audio format is not supported." },
      { status: 415 },
    );
  }
  if (!(languageValue in SUPPORTED_LANGUAGES)) {
    return NextResponse.json(
      { success: false, error: "The selected language is not supported." },
      { status: 400 },
    );
  }

  try {
    const result = await transcribeSpeech(
      audio,
      languageValue as SupportedLanguageCode,
    );
    logOperationalEvent("info", "voice.transcription_completed", {
      userId: auth.status === "verified" ? auth.uid : "development",
      language: result.language,
      provider: result.provider,
      fallbackUsed: result.fallbackUsed,
      durationMs,
      audioBytes: audio.size,
    });
    return NextResponse.json(
      { success: true, data: result },
      {
        headers: {
          "Cache-Control": "no-store, private",
        },
      },
    );
  } catch (error) {
    if (error instanceof NoSpeechDetectedError) {
      return NextResponse.json(
        {
          success: false,
          error: "I could not hear clear speech. Try again somewhere quieter, or type your message.",
        },
        { status: 422 },
      );
    }
    logOperationalEvent("error", "voice.transcription_failed", {
      userId: auth.status === "verified" ? auth.uid : "development",
      language: languageValue,
      durationMs,
      audioBytes: audio.size,
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      {
        success: false,
        error: "Voice transcription is temporarily unavailable. You can still type your message.",
      },
      { status: 503 },
    );
  }
}

export const POST = withApiObservability(
  "language_transcription",
  postTranscription,
);

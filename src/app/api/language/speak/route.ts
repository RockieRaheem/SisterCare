import { NextRequest, NextResponse } from "next/server";
import { logOperationalEvent, withApiObservability } from "@/lib/observability";
import { consumeRateLimit } from "@/lib/server/rateLimit";
import { authenticateRequest, getAuthorizationFailure } from "@/lib/serverAuth";
import {
  normalizeSupportedLanguageCode,
  resolveSunbirdVoice,
  SpeechVoiceUnavailableError,
  SUPPORTED_LANGUAGES,
} from "@/lib/sunbird";
import { synthesizeSpokenResponse } from "@/lib/spokenResponse";

export const runtime = "nodejs";
const MAX_SPOKEN_TEXT_LENGTH = 4_000;

async function postSpeech(request: NextRequest) {
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
  const quota = await consumeRateLimit("spoken-response", identity, 30, 60_000);
  if (!quota.allowed) {
    return NextResponse.json(
      { success: false, error: "Please wait a moment before playing another response." },
      {
        status: 429,
        headers: { "Retry-After": String(quota.retryAfterSeconds) },
      },
    );
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const rawLanguage =
    typeof body?.language === "string" ? body.language.trim().toLowerCase() : "eng";
  const language = normalizeSupportedLanguageCode(rawLanguage);
  const requestedVoice =
    typeof body?.voice === "string" ? body.voice.trim() : undefined;

  if (!text) {
    return NextResponse.json(
      { success: false, error: "Text is required for speech." },
      { status: 400 },
    );
  }
  if (text.length > MAX_SPOKEN_TEXT_LENGTH) {
    return NextResponse.json(
      { success: false, error: "This response is too long to play as one audio message." },
      { status: 413 },
    );
  }
  if (!(rawLanguage in SUPPORTED_LANGUAGES) && language === "eng" && rawLanguage !== "eng" && rawLanguage !== "en") {
    return NextResponse.json(
      { success: false, error: "The selected speech language is not supported." },
      { status: 400 },
    );
  }

  try {
    const voice = resolveSunbirdVoice(language, requestedVoice);
    if (requestedVoice && voice.id !== requestedVoice) {
      return NextResponse.json(
        { success: false, error: "The selected voice is not available for this language." },
        { status: 400 },
      );
    }
    const audio = await synthesizeSpokenResponse(
      text,
      language,
      undefined,
      voice.id,
    );
    if (!audio) throw new Error("Speech provider returned no audio URL");
    logOperationalEvent("info", "voice.response_created", {
      userId: auth.status === "verified" ? auth.uid : "development",
      language,
      characterCount: text.length,
    });
    return NextResponse.json(
      { success: true, data: audio },
      { headers: { "Cache-Control": "no-store, private" } },
    );
  } catch (error) {
    if (error instanceof SpeechVoiceUnavailableError) {
      return NextResponse.json(
        {
          success: false,
          code: "VOICE_NOT_AVAILABLE",
          error: error.message,
        },
        { status: 422 },
      );
    }
    const detail = error instanceof Error ? error.message : "";
    if (/could not validate credentials|unauthori[sz]ed|http 401/i.test(detail)) {
      logOperationalEvent("error", "voice.provider_authentication_failed", {
        language,
        errorType: error instanceof Error ? error.name : "unknown",
      });
      return NextResponse.json(
        {
          success: false,
          code: "SPEECH_PROVIDER_AUTH_INVALID",
          error: "Spoken replies need a service configuration update. The written response is still available.",
        },
        { status: 503 },
      );
    }
    logOperationalEvent("error", "voice.response_failed", {
      userId: auth.status === "verified" ? auth.uid : "development",
      language,
      characterCount: text.length,
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      {
        success: false,
        error: "Spoken replies are temporarily unavailable. The written response is still available.",
      },
      { status: 503 },
    );
  }
}

export const POST = withApiObservability("language_speech", postSpeech);

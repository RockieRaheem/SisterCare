import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAuthorizationFailure } from "@/lib/serverAuth";
import {
  speechToText,
  SUPPORTED_LANGUAGES,
  SupportedLanguageCode,
} from "@/lib/sunbird";
import { MAX_VOICE_UPLOAD_BYTES } from "@/lib/speechCapture";

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

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  const authorizationFailure = getAuthorizationFailure(auth);
  if (authorizationFailure) {
    return NextResponse.json(
      { success: false, error: authorizationFailure.error },
      { status: authorizationFailure.status },
    );
  }

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  const languageValue = String(form?.get("language") || "lug").toLowerCase();
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
    const result = await speechToText(
      audio,
      languageValue as SupportedLanguageCode,
    );
    return NextResponse.json(
      { success: true, data: result },
      {
        headers: {
          "Cache-Control": "no-store, private",
        },
      },
    );
  } catch (error) {
    console.error("Sunbird speech transcription failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Voice transcription is temporarily unavailable. You can still type your message.",
      },
      { status: 503 },
    );
  }
}

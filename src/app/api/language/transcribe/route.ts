import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAuthorizationFailure } from "@/lib/serverAuth";
import {
  speechToText,
  SUPPORTED_LANGUAGES,
  SupportedLanguageCode,
} from "@/lib/sunbird";

export const runtime = "nodejs";
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

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
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { success: false, error: "The recording is too large. Keep it under 15 MB." },
      { status: 413 },
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
    return NextResponse.json({ success: true, data: result });
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

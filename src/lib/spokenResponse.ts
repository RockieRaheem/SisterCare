import {
  SupportedLanguageCode,
  textToSpeechCached,
} from "@/lib/sunbird";

export interface SpokenResponseAudio {
  url: string;
  durationSeconds: number;
  mimeType: string;
  language: SupportedLanguageCode;
  voice: string;
}

export function resolveSpokenLanguage(input: {
  requestedLanguage: SupportedLanguageCode;
  englishText: string;
  localizedText: string;
}): SupportedLanguageCode {
  if (input.requestedLanguage === "eng") return "eng";
  return input.localizedText.trim() === input.englishText.trim()
    ? "eng"
    : input.requestedLanguage;
}

export async function synthesizeSpokenResponse(
  text: string,
  language: SupportedLanguageCode,
  synthesize: typeof textToSpeechCached = textToSpeechCached,
  voiceId?: string,
): Promise<SpokenResponseAudio | undefined> {
  const normalized = text.trim();
  if (!normalized) return undefined;

  const result = await synthesize(normalized, language, 0.7, voiceId);
  if (!result.audioUrl) return undefined;
  const format = result.format.toLowerCase().replace(/[^a-z0-9.+-]/g, "");
  return {
    url: result.audioUrl,
    durationSeconds: Math.max(0, Number(result.durationSeconds) || 0),
    mimeType: format === "wav" ? "audio/wav" : `audio/${format || "mpeg"}`,
    language,
    voice: result.voice,
  };
}

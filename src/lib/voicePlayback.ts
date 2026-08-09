import type { SupportedLanguageCode } from "@/lib/sunbird";
import { getSunbirdVoices } from "@/lib/sunbird";

export const VOICE_REPLIES_STORAGE_KEY = "sistercare-voice-replies";
export const VOICE_SELECTIONS_STORAGE_KEY = "sistercare-voice-selections";
export type VoiceSelections = Partial<Record<SupportedLanguageCode, string>>;

const SPEECH_LOCALES: Record<SupportedLanguageCode, string> = {
  eng: "en-UG",
  lug: "lg-UG",
  ach: "ach-UG",
  lgg: "lgg-UG",
  nyn: "nyn-UG",
  teo: "teo-UG",
  swa: "sw-UG",
};

export function speechLocale(language?: string): string {
  return SPEECH_LOCALES[language as SupportedLanguageCode] || "en-UG";
}

export function readVoiceRepliesPreference(
  storage?: Pick<Storage, "getItem">,
): boolean {
  try {
    return storage?.getItem(VOICE_REPLIES_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function readVoiceSelections(
  storage?: Pick<Storage, "getItem">,
): VoiceSelections {
  try {
    const raw = storage?.getItem(VOICE_SELECTIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: VoiceSelections = {};
    for (const language of Object.keys(parsed) as SupportedLanguageCode[]) {
      const requested = parsed[language];
      if (
        typeof requested === "string" &&
        getSunbirdVoices(language)?.some((voice) => voice.id === requested)
      ) {
        result[language] = requested;
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function selectedVoiceForLanguage(
  language: SupportedLanguageCode,
  selections: VoiceSelections,
): string | undefined {
  const voices = getSunbirdVoices(language);
  if (!voices.length) return undefined;
  return voices.some((voice) => voice.id === selections[language])
    ? selections[language]
    : voices[0].id;
}

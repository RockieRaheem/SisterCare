import type { SupportedLanguageCode } from "@/lib/sunbird";

export const VOICE_REPLIES_STORAGE_KEY = "sistercare-voice-replies";

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

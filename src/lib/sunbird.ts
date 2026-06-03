/**
 * Sunbird AI Integration Library
 * Handles speech-to-text, language detection, translation, and text-to-speech
 * for comprehensive local language support in SisterCare
 */

const SUNBIRD_API_KEY =
  process.env.NEXT_PUBLIC_SUNBIRD_API_KEY || process.env.SUNBIRD_API_KEY;
const SUNBIRD_API_URL = "https://api.sunbird.ai/tasks";

// Language code mapping
export const SUPPORTED_LANGUAGES = {
  lug: {
    code: "lug",
    name: "Luganda",
    region: "Central Uganda",
    ttsSpeakerId: 248,
  },
  nyn: {
    code: "nyn",
    name: "Runyankole",
    region: "Southwest Uganda",
    ttsSpeakerId: 243,
  },
  teo: {
    code: "teo",
    name: "Ateso",
    region: "Eastern Uganda",
    ttsSpeakerId: 242,
  },
  ach: {
    code: "ach",
    name: "Acholi",
    region: "Northern Uganda",
    ttsSpeakerId: 241,
  },
  lgg: {
    code: "lgg",
    name: "Lugbara",
    region: "West Nile Uganda",
    ttsSpeakerId: 245,
  },
  eng: {
    code: "eng",
    name: "English",
    region: "International",
    ttsSpeakerId: 248,
  },
  sw: { code: "sw", name: "Swahili", region: "Regional", ttsSpeakerId: 246 },
};

export type SupportedLanguageCode = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Speech-to-Text: Convert audio to text in user's local language
 * @param audioFile - Audio file or blob
 * @param languageCode - Language code (lug, nyn, teo, ach, lgg, eng, sw)
 * @returns Transcribed text and metadata
 */
export async function speechToText(
  audioFile: File | Blob,
  languageCode: SupportedLanguageCode = "lug",
): Promise<{
  transcript: string;
  language: string;
  wasAudioTrimmed: boolean;
  originalDurationMinutes: number | null;
}> {
  if (!SUNBIRD_API_KEY) {
    throw new Error("SUNBIRD_API_KEY environment variable not set");
  }

  const formData = new FormData();
  formData.append("audio", audioFile);
  formData.append("language", languageCode);
  formData.append("adapter", languageCode);
  formData.append("recognise_speakers", "false");
  formData.append("whisper", "false");

  const response = await fetch(`${SUNBIRD_API_URL}/stt`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNBIRD_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`STT failed: ${errorData.detail || response.statusText}`);
  }

  const data = await response.json();

  return {
    transcript: data.audio_transcription || "",
    language: data.language,
    wasAudioTrimmed: data.was_audio_trimmed || false,
    originalDurationMinutes: data.original_duration_minutes || null,
  };
}

/**
 * Language Detection: Auto-detect language from text
 * @param text - Text to detect language for
 * @returns Detected language code and confidence
 */
export async function detectLanguage(text: string): Promise<{
  language: SupportedLanguageCode;
  confidence: number;
}> {
  if (!SUNBIRD_API_KEY) {
    throw new Error("SUNBIRD_API_KEY environment variable not set");
  }

  const response = await fetch(`${SUNBIRD_API_URL}/language_id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNBIRD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Language detection failed: ${errorData.detail || response.statusText}`,
    );
  }

  const data = await response.json();

  return {
    language: (data.language || "eng") as SupportedLanguageCode,
    confidence: data.confidence || 0.9,
  };
}

/**
 * Translate text between English and local languages
 * @param text - Text to translate
 * @param sourceLanguage - Source language code
 * @param targetLanguage - Target language code
 * @returns Translated text
 */
export async function translateText(
  text: string,
  sourceLanguage: SupportedLanguageCode = "eng",
  targetLanguage: SupportedLanguageCode = "lug",
): Promise<{
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}> {
  if (!SUNBIRD_API_KEY) {
    throw new Error("SUNBIRD_API_KEY environment variable not set");
  }

  // If both languages are the same, return original text
  if (sourceLanguage === targetLanguage) {
    return {
      translatedText: text,
      sourceLanguage,
      targetLanguage,
    };
  }

  const response = await fetch(`${SUNBIRD_API_URL}/nllb_translate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNBIRD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_language: sourceLanguage,
      target_language: targetLanguage,
      text,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Translation failed: ${errorData.detail || response.statusText}`,
    );
  }

  const data = await response.json();

  return {
    translatedText: data.output?.translated_text || text,
    sourceLanguage: data.output?.source_language || sourceLanguage,
    targetLanguage: data.output?.target_language || targetLanguage,
  };
}

/**
 * Text-to-Speech: Convert text to speech in specified language
 * @param text - Text to convert to speech
 * @param languageCode - Language code
 * @param temperature - Voice expressiveness (0.0-2.0, default 0.7)
 * @returns Audio URL and metadata
 */
export async function textToSpeech(
  text: string,
  languageCode: SupportedLanguageCode = "lug",
  temperature = 0.7,
): Promise<{
  audioUrl: string;
  durationSeconds: number;
  blobPath: string;
  sampleRate: number;
  format: string;
}> {
  if (!SUNBIRD_API_KEY) {
    throw new Error("SUNBIRD_API_KEY environment variable not set");
  }

  const language = SUPPORTED_LANGUAGES[languageCode];
  if (!language) {
    throw new Error(`Unsupported language: ${languageCode}`);
  }

  const response = await fetch(`${SUNBIRD_API_URL}/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNBIRD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      speaker_id: language.ttsSpeakerId,
      temperature: Math.min(Math.max(temperature, 0), 2),
      max_new_audio_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`TTS failed: ${errorData.detail || response.statusText}`);
  }

  const data = await response.json();

  return {
    audioUrl: data.output?.audio_url || "",
    durationSeconds: data.output?.duration_seconds || 0,
    blobPath: data.output?.blob || "",
    sampleRate: data.output?.sample_rate || 16000,
    format: data.output?.format || "mp3",
  };
}

/**
 * Summarize text (English or Luganda)
 * @param text - Text to summarize
 * @returns Summarized text
 */
export async function summarizeText(text: string): Promise<{
  summarizedText: string;
  language: string;
}> {
  if (!SUNBIRD_API_KEY) {
    throw new Error("SUNBIRD_API_KEY environment variable not set");
  }

  const response = await fetch(`${SUNBIRD_API_URL}/summarise`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNBIRD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Summarization failed: ${errorData.detail || response.statusText}`,
    );
  }

  const data = await response.json();

  return {
    summarizedText: data.summarized_text || "",
    language: data.language || "eng",
  };
}

/**
 * Convert language name to code (e.g., "Luganda" -> "lug")
 */
export function languageNameToCode(name: string): SupportedLanguageCode {
  const lower = name.toLowerCase();
  for (const [code, lang] of Object.entries(SUPPORTED_LANGUAGES)) {
    if (lang.name.toLowerCase() === lower) {
      return code as SupportedLanguageCode;
    }
  }
  return "eng"; // Default to English
}

/**
 * Get language info by code
 */
export function getLanguageInfo(code: SupportedLanguageCode) {
  return SUPPORTED_LANGUAGES[code] || SUPPORTED_LANGUAGES.eng;
}

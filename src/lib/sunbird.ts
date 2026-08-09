/**
 * Sunbird AI Integration Library
 * Handles speech-to-text, language detection, translation, and text-to-speech
 * for comprehensive local language support in SisterCare
 */

const SUNBIRD_API_URL = "https://api.sunbird.ai/tasks";
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const REQUEST_TIMEOUT_MS = 25_000;

function apiKey(): string {
  const key = process.env.SUNBIRD_API_KEY?.trim();
  if (!key) throw new Error("SUNBIRD_API_KEY environment variable not set");
  return key;
}

async function sunbirdRequest(
  endpoint: string,
  init: RequestInit,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  let lastResponse: Response | null = null;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetcher(`${SUNBIRD_API_URL}${endpoint}`, {
        ...init,
        signal: controller.signal,
      });
      lastResponse = response;
      if (!RETRYABLE_STATUS.has(response.status) || attempt === 1) {
        return response;
      }
      const retryAfter = Number(response.headers.get("retry-after"));
      await new Promise((resolve) =>
        setTimeout(resolve, Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 2_000)
          : 250 + Math.round(Math.random() * 250)),
      );
    } catch (error) {
      lastError = error;
      if (attempt === 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    } finally {
      clearTimeout(timeout);
    }
  }
  if (lastResponse) return lastResponse;
  throw lastError || new Error("Sunbird request failed");
}

async function errorDetail(response: Response): Promise<string> {
  const payload = await response.json().catch(() => null);
  return typeof payload?.detail === "string"
    ? payload.detail
    : response.statusText || `HTTP ${response.status}`;
}

// Language code mapping
export const SUPPORTED_LANGUAGES = {
  eng: {
    code: "eng",
    name: "English",
    nativeName: "English",
    region: "Uganda and international",
  },
  lug: {
    code: "lug",
    name: "Luganda",
    nativeName: "Oluganda",
    region: "Central Uganda",
  },
  ach: {
    code: "ach",
    name: "Acholi",
    nativeName: "Leb Acoli",
    region: "Northern Uganda",
  },
  lgg: {
    code: "lgg",
    name: "Lugbara",
    nativeName: "Lugbarati",
    region: "West Nile Uganda",
  },
  nyn: {
    code: "nyn",
    name: "Runyankole",
    nativeName: "Runyankore",
    region: "Southwest Uganda",
  },
  teo: {
    code: "teo",
    name: "Ateso",
    nativeName: "Ateso",
    region: "Eastern Uganda",
  },
  swa: {
    code: "swa",
    name: "Swahili",
    nativeName: "Kiswahili",
    region: "East Africa",
  },
} as const;

export type SupportedLanguageCode = keyof typeof SUPPORTED_LANGUAGES;

export interface SunbirdVoiceOption {
  id: string;
  label: string;
}

/** Current Orpheus catalog tags published by Sunbird. */
export const SUNBIRD_VOICE_CATALOG: Record<
  SupportedLanguageCode,
  readonly SunbirdVoiceOption[]
> = {
  eng: [
    { id: "salt_eng_0001", label: "English voice 1" },
    { id: "salt_eng_0002", label: "English voice 2" },
    { id: "salt_eng_0003", label: "English voice 3" },
  ],
  lug: [
    { id: "salt_lug_0001", label: "Luganda voice 1" },
    { id: "waxal_lug_0002", label: "Luganda voice 2" },
    { id: "waxal_lug_0003", label: "Luganda voice 3" },
    { id: "waxal_lug_0004", label: "Luganda voice 4" },
    { id: "waxal_lug_0005", label: "Luganda voice 5" },
    { id: "waxal_lug_0006", label: "Luganda voice 6" },
    { id: "waxal_lug_0007", label: "Luganda voice 7" },
    { id: "waxal_lug_0008", label: "Luganda voice 8" },
  ],
  ach: [
    { id: "salt_ach_0001", label: "Acholi voice 1" },
    { id: "waxal_ach_0001", label: "Acholi voice 2" },
    { id: "waxal_ach_0005", label: "Acholi voice 3" },
    { id: "waxal_ach_0006", label: "Acholi voice 4" },
    { id: "waxal_ach_0008", label: "Acholi voice 5" },
  ],
  // Sunbird documents Lugbara in the model training mix but currently
  // exposes no selectable Lugbara speaker ID.
  lgg: [],
  nyn: [
    { id: "salt_nyn_0001", label: "Runyankole voice 1" },
    { id: "waxal_nyn_0003", label: "Runyankole voice 2" },
    { id: "waxal_nyn_0004", label: "Runyankole voice 3" },
    { id: "waxal_nyn_0007", label: "Runyankole voice 4" },
    { id: "waxal_nyn_0008", label: "Runyankole voice 5" },
  ],
  teo: [{ id: "salt_teo_0001", label: "Ateso voice 1" }],
  swa: [
    { id: "waxal_swa_0006", label: "Swahili voice 1" },
    { id: "waxal_swa_0007", label: "Swahili voice 2" },
  ],
};

export class SpeechVoiceUnavailableError extends Error {
  constructor(language: SupportedLanguageCode) {
    super(`Sunbird does not currently expose a ${SUPPORTED_LANGUAGES[language].name} voice.`);
    this.name = "SpeechVoiceUnavailableError";
  }
}

export function getSunbirdVoices(
  language: SupportedLanguageCode,
): readonly SunbirdVoiceOption[] {
  return SUNBIRD_VOICE_CATALOG[language];
}

export function resolveSunbirdVoice(
  language: SupportedLanguageCode,
  requestedVoice?: string | null,
): SunbirdVoiceOption {
  const voices = getSunbirdVoices(language);
  if (!voices.length) throw new SpeechVoiceUnavailableError(language);
  return voices.find((voice) => voice.id === requestedVoice) || voices[0];
}

const LANGUAGE_ALIASES: Record<string, SupportedLanguageCode> = {
  en: "eng",
  eng: "eng",
  english: "eng",
  "english (uganda)": "eng",
  lg: "lug",
  lug: "lug",
  luganda: "lug",
  oluganda: "lug",
  ach: "ach",
  acholi: "ach",
  "leb acoli": "ach",
  lgg: "lgg",
  lugbara: "lgg",
  lugbarati: "lgg",
  nyn: "nyn",
  runyankole: "nyn",
  runyankore: "nyn",
  nyankole: "nyn",
  teo: "teo",
  ateso: "teo",
  sw: "swa",
  swa: "swa",
  swahili: "swa",
  kiswahili: "swa",
};

export function normalizeSupportedLanguageCode(
  value?: string | null,
): SupportedLanguageCode {
  const normalized = value?.trim().toLocaleLowerCase();
  return (normalized && LANGUAGE_ALIASES[normalized]) || "eng";
}

/**
 * Speech-to-Text: Convert audio to text in user's local language
 * @param audioFile - Audio file or blob
 * @param languageCode - Canonical Sunbird language code
 * @returns Transcribed text and metadata
 */
export async function speechToText(
  audioFile: File | Blob,
  languageCode: SupportedLanguageCode = "lug",
  fetcher: typeof fetch = fetch,
): Promise<{
  transcript: string;
  language: string;
  wasAudioTrimmed: boolean;
  originalDurationMinutes: number | null;
}> {
  const formData = new FormData();
  formData.append("audio", audioFile);
  formData.append("language", languageCode);

  const response = await sunbirdRequest("/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
    },
    body: formData,
  }, fetcher);

  if (!response.ok) {
    throw new Error(`STT failed: ${await errorDetail(response)}`);
  }

  const data = await response.json();

  return {
    transcript:
      data.output?.text || data.audio_transcription || data.text || "",
    language: normalizeSupportedLanguageCode(
      data.output?.language || data.language || languageCode,
    ),
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
  const response = await sunbirdRequest("/language_id", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Language detection failed: ${await errorDetail(response)}`);
  }

  const data = await response.json();

  return {
    language: normalizeSupportedLanguageCode(
      data.output?.language || data.language || "eng",
    ),
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
  // If both languages are the same, return original text
  if (sourceLanguage === targetLanguage) {
    return {
      translatedText: text,
      sourceLanguage,
      targetLanguage,
    };
  }

  const request: RequestInit = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_language: sourceLanguage,
      target_language: targetLanguage,
      text,
    }),
  };
  // /translate is Sunbird's current Sunflower translation endpoint. Retain
  // the documented NLLB endpoint only as a compatibility fallback for an
  // account that has not yet been moved to the current task router.
  let response = await sunbirdRequest("/translate", request);
  if (response.status === 404 || response.status === 405) {
    response = await sunbirdRequest("/nllb_translate", request);
  }

  if (!response.ok) {
    throw new Error(`Translation failed: ${await errorDetail(response)}`);
  }

  const data = await response.json();
  const translatedText = parseSunbirdTranslation(
    data,
    text,
    sourceLanguage,
    targetLanguage,
  );

  return {
    translatedText,
    sourceLanguage: data.output?.source_language || sourceLanguage,
    targetLanguage: data.output?.target_language || targetLanguage,
  };
}

export function parseSunbirdTranslation(
  data: Record<string, unknown>,
  sourceText: string,
  sourceLanguage: SupportedLanguageCode,
  targetLanguage: SupportedLanguageCode,
): string {
  const output =
    data.output && typeof data.output === "object"
      ? (data.output as Record<string, unknown>)
      : {};
  const translatedText =
    typeof output.translated_text === "string"
      ? output.translated_text.trim()
      : "";
  if (!translatedText) {
    throw new Error("Translation failed: Sunbird returned no translated text");
  }
  if (
    sourceLanguage !== targetLanguage &&
    translatedText.toLocaleLowerCase() === sourceText.trim().toLocaleLowerCase()
  ) {
    throw new Error("Translation failed: Sunbird returned the source text unchanged");
  }
  if (
    sourceText.trim().length >= 120 &&
    translatedText.length < sourceText.trim().length * 0.2
  ) {
    throw new Error("Translation failed: Sunbird returned an incomplete translation");
  }
  const returnedTarget =
    typeof output.target_language === "string"
      ? output.target_language.toLowerCase()
      : "";
  const expectedTargetName = SUPPORTED_LANGUAGES[targetLanguage].name.toLowerCase();
  if (
    returnedTarget &&
    returnedTarget !== targetLanguage &&
    returnedTarget !== expectedTargetName
  ) {
    throw new Error("Translation failed: Sunbird returned the wrong target language");
  }
  return translatedText;
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
  _temperature = 0.7,
  voiceId?: string,
  fetcher: typeof fetch = fetch,
): Promise<{
  audioUrl: string;
  durationSeconds: number;
  blobPath: string;
  sampleRate: number;
  format: string;
  voice: string;
}> {
  if (!SUPPORTED_LANGUAGES[languageCode]) {
    throw new Error(`Unsupported language: ${languageCode}`);
  }
  const voice = resolveSunbirdVoice(languageCode, voiceId);

  const response = await sunbirdRequest("/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice: voice.id,
      language: languageCode,
      response_mode: "url",
    }),
  }, fetcher);

  if (!response.ok) {
    throw new Error(`TTS failed: ${await errorDetail(response)}`);
  }

  const data = await response.json();

  return {
    audioUrl: data.audio_url || data.output?.audio_url || "",
    durationSeconds:
      data.duration_seconds || data.output?.duration_seconds || 0,
    blobPath: data.gcs_object || data.output?.blob || "",
    sampleRate: data.sample_rate || data.output?.sample_rate || 24000,
    format: data.format || data.output?.format || "wav",
    voice: data.voice || voice.id,
  };
}

// Server-side memo for TTS results. Canned responses (crisis interventions,
// confirmations, fallbacks) repeat verbatim, so re-synthesizing them wastes
// seconds of latency and Sunbird quota. TTL stays short because the returned
// audio URLs point at hosted blobs whose lifetime we don't control.
type TtsResult = Awaited<ReturnType<typeof textToSpeech>>;
const ttsMemo = new Map<string, { result: TtsResult; expiresAt: number }>();
const TTS_MEMO_TTL_MS = 30 * 60000;
const TTS_MEMO_MAX_ENTRIES = 200;

export async function textToSpeechCached(
  text: string,
  languageCode: SupportedLanguageCode = "lug",
  temperature = 0.7,
  voiceId?: string,
): Promise<TtsResult> {
  const voice = resolveSunbirdVoice(languageCode, voiceId);
  const key = `${languageCode}|${voice.id}|${text}`;
  const now = Date.now();

  const cached = ttsMemo.get(key);
  if (cached && now < cached.expiresAt && cached.result.audioUrl) {
    return cached.result;
  }

  const result = await textToSpeech(text, languageCode, temperature, voice.id);

  if (result.audioUrl) {
    if (ttsMemo.size >= TTS_MEMO_MAX_ENTRIES) {
      // Evict oldest entries (Map preserves insertion order)
      for (const oldKey of ttsMemo.keys()) {
        ttsMemo.delete(oldKey);
        if (ttsMemo.size < TTS_MEMO_MAX_ENTRIES) break;
      }
    }
    ttsMemo.set(key, { result, expiresAt: now + TTS_MEMO_TTL_MS });
  }

  return result;
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
  const response = await sunbirdRequest("/summarise", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Summarization failed: ${await errorDetail(response)}`);
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
  return normalizeSupportedLanguageCode(name);
}

/**
 * Get language info by code
 */
export function getLanguageInfo(code: SupportedLanguageCode) {
  return SUPPORTED_LANGUAGES[code] || SUPPORTED_LANGUAGES.eng;
}

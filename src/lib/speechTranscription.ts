import {
  speechToText,
  SupportedLanguageCode,
} from "@/lib/sunbird";

const GROQ_TRANSCRIPTION_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";
const TRANSCRIPTION_TIMEOUT_MS = 30_000;
const NON_SPEECH_TRANSCRIPTS = new Set([
  "[blank_audio]",
  "[inaudible]",
  "[music]",
  "(music)",
]);

export type SpeechTranscriptionProvider = "sunbird" | "groq";

export interface SpeechTranscriptionResult {
  transcript: string;
  language: SupportedLanguageCode;
  provider: SpeechTranscriptionProvider;
  fallbackUsed: boolean;
  wasAudioTrimmed: boolean;
  originalDurationMinutes: number | null;
}

export class NoSpeechDetectedError extends Error {
  constructor() {
    super("No clear speech was detected in the recording.");
    this.name = "NoSpeechDetectedError";
  }
}

function cleanTranscript(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 8_000);
}

export function requireUsableTranscript(value: unknown): string {
  const transcript = cleanTranscript(value);
  if (
    !transcript ||
    NON_SPEECH_TRANSCRIPTS.has(transcript.toLocaleLowerCase())
  ) {
    throw new NoSpeechDetectedError();
  }
  return transcript;
}

async function transcribeEnglishWithGroq(
  audio: File,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) throw new Error("GROQ_API_KEY is not configured");

  const form = new FormData();
  form.append("file", audio, audio.name || "sistercare-voice.webm");
  form.append(
    "model",
    process.env.GROQ_TRANSCRIPTION_MODEL?.trim() || "whisper-large-v3",
  );
  form.append("language", "en");
  form.append("response_format", "json");
  form.append("temperature", "0");
  form.append(
    "prompt",
    "SisterCare conversation in Ugandan English about emotional wellbeing, counselling, periods, symptoms, relationships, and personal support.",
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);
  try {
    const response = await fetcher(GROQ_TRANSCRIPTION_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Groq transcription failed with HTTP ${response.status}`);
    }
    const data = await response.json();
    return requireUsableTranscript(data?.text);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Sunbird remains authoritative for every supported Ugandan language. Groq is
 * an English-only resilience path because its hosted Whisper model is not our
 * verified source for the six local-language contracts.
 */
export async function transcribeSpeech(
  audio: File,
  language: SupportedLanguageCode,
  dependencies: {
    sunbird?: typeof speechToText;
    groq?: (audio: File) => Promise<string>;
  } = {},
): Promise<SpeechTranscriptionResult> {
  const sunbird = dependencies.sunbird || speechToText;
  try {
    const result = await sunbird(audio, language);
    return {
      transcript: requireUsableTranscript(result.transcript),
      language,
      provider: "sunbird",
      fallbackUsed: false,
      wasAudioTrimmed: result.wasAudioTrimmed,
      originalDurationMinutes: result.originalDurationMinutes,
    };
  } catch (sunbirdError) {
    if (sunbirdError instanceof NoSpeechDetectedError) throw sunbirdError;
    if (language !== "eng" || !process.env.GROQ_API_KEY?.trim()) {
      throw sunbirdError;
    }
    const groq = dependencies.groq || transcribeEnglishWithGroq;
    return {
      transcript: requireUsableTranscript(await groq(audio)),
      language: "eng",
      provider: "groq",
      fallbackUsed: true,
      wasAudioTrimmed: false,
      originalDurationMinutes: null,
    };
  }
}

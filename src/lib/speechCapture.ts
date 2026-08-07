export const MAX_VOICE_RECORDING_SECONDS = 60;
export const MAX_VOICE_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MIN_VOICE_RECORDING_MS = 500;
export const MIN_VOICE_RECORDING_BYTES = 512;

const RECORDING_FORMATS = [
  { mimeType: "audio/webm;codecs=opus", extension: "webm" },
  { mimeType: "audio/mp4", extension: "m4a" },
  { mimeType: "audio/ogg;codecs=opus", extension: "ogg" },
  { mimeType: "audio/webm", extension: "webm" },
] as const;

export interface RecordingFormat {
  mimeType?: string;
  extension: string;
}

export function selectRecordingFormat(
  isTypeSupported?: (mimeType: string) => boolean,
): RecordingFormat {
  if (!isTypeSupported) return { extension: "webm" };
  const supported = RECORDING_FORMATS.find(({ mimeType }) =>
    isTypeSupported(mimeType),
  );
  return supported || { extension: "webm" };
}

export function voiceCaptureConstraints(): MediaStreamConstraints {
  return {
    audio: {
      channelCount: { ideal: 1 },
      echoCancellation: { ideal: true },
      noiseSuppression: { ideal: true },
      autoGainControl: { ideal: true },
      sampleRate: { ideal: 16_000 },
    },
    video: false,
  };
}

export function validateVoiceRecording(input: {
  bytes: number;
  durationMs: number;
}): string | null {
  if (
    input.bytes < MIN_VOICE_RECORDING_BYTES ||
    input.durationMs < MIN_VOICE_RECORDING_MS
  ) {
    return "I could not hear enough speech. Hold the microphone button a little longer and try again.";
  }
  if (input.bytes > MAX_VOICE_UPLOAD_BYTES) {
    return "That recording is too large. Please send a voice message under one minute.";
  }
  return null;
}

export function voiceFileName(format: RecordingFormat): string {
  return `sistercare-voice.${format.extension}`;
}

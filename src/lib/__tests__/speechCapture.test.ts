import { describe, expect, it } from "vitest";
import {
  MAX_VOICE_UPLOAD_BYTES,
  selectRecordingFormat,
  validateVoiceRecording,
  voiceCaptureConstraints,
  voiceFileName,
} from "../speechCapture";

describe("speech capture", () => {
  it("selects the first recording format supported by the browser", () => {
    const format = selectRecordingFormat((mimeType) =>
      mimeType.startsWith("audio/mp4"),
    );
    expect(format).toEqual({ mimeType: "audio/mp4", extension: "m4a" });
    expect(voiceFileName(format)).toBe("sistercare-voice.m4a");
  });

  it("falls back to browser-selected encoding when format probing is absent", () => {
    expect(selectRecordingFormat()).toEqual({ extension: "webm" });
  });

  it("requests speech-friendly mono capture constraints", () => {
    expect(voiceCaptureConstraints()).toMatchObject({
      audio: {
        channelCount: { ideal: 1 },
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true },
      },
      video: false,
    });
  });

  it("rejects empty, very short and oversized recordings", () => {
    expect(validateVoiceRecording({ bytes: 10, durationMs: 2_000 })).toMatch(
      /could not hear enough speech/i,
    );
    expect(validateVoiceRecording({ bytes: 2_000, durationMs: 100 })).toMatch(
      /could not hear enough speech/i,
    );
    expect(
      validateVoiceRecording({
        bytes: MAX_VOICE_UPLOAD_BYTES + 1,
        durationMs: 2_000,
      }),
    ).toMatch(/too large/i);
    expect(
      validateVoiceRecording({ bytes: 2_000, durationMs: 2_000 }),
    ).toBeNull();
  });
});

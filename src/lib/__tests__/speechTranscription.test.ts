import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NoSpeechDetectedError,
  requireUsableTranscript,
  transcribeSpeech,
} from "../speechTranscription";

const audio = new File([new Uint8Array(1_024)], "voice.webm", {
  type: "audio/webm",
});

describe("speech transcription routing", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses Sunbird as the primary provider", async () => {
    const sunbird = vi.fn().mockResolvedValue({
      transcript: "  Oli otya?  ",
      language: "lug",
      wasAudioTrimmed: false,
      originalDurationMinutes: 0.1,
    });

    await expect(transcribeSpeech(audio, "lug", { sunbird })).resolves.toEqual({
      transcript: "Oli otya?",
      language: "lug",
      provider: "sunbird",
      fallbackUsed: false,
      wasAudioTrimmed: false,
      originalDurationMinutes: 0.1,
    });
  });

  it("uses Groq only when English Sunbird transcription is unavailable", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const sunbird = vi.fn().mockRejectedValue(new Error("provider unavailable"));
    const groq = vi.fn().mockResolvedValue("I need someone to talk to.");

    await expect(
      transcribeSpeech(audio, "eng", { sunbird, groq }),
    ).resolves.toMatchObject({
      transcript: "I need someone to talk to.",
      provider: "groq",
      fallbackUsed: true,
      language: "eng",
    });
    expect(groq).toHaveBeenCalledOnce();
  });

  it("never sends local-language audio to the English fallback", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const failure = new Error("provider unavailable");
    const groq = vi.fn();

    await expect(
      transcribeSpeech(audio, "ach", {
        sunbird: vi.fn().mockRejectedValue(failure),
        groq,
      }),
    ).rejects.toBe(failure);
    expect(groq).not.toHaveBeenCalled();
  });

  it("rejects empty and non-speech provider output", () => {
    expect(() => requireUsableTranscript(" [BLANK_AUDIO] ")).toThrow(
      NoSpeechDetectedError,
    );
    expect(() => requireUsableTranscript("   ")).toThrow(NoSpeechDetectedError);
  });
});

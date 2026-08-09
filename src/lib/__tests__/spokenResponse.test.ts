import { describe, expect, it, vi } from "vitest";
import {
  resolveSpokenLanguage,
  synthesizeSpokenResponse,
} from "../spokenResponse";

describe("spoken agent responses", () => {
  it("uses the selected local voice only for successfully localized text", () => {
    expect(resolveSpokenLanguage({
      requestedLanguage: "lug",
      englishText: "You are not alone.",
      localizedText: "Toli wekka.",
    })).toBe("lug");
    expect(resolveSpokenLanguage({
      requestedLanguage: "lug",
      englishText: "You are not alone.",
      localizedText: "You are not alone.",
    })).toBe("eng");
  });

  it("returns playable metadata for English replies", async () => {
    const synthesize = vi.fn().mockResolvedValue({
      audioUrl: "https://audio.test/reply.wav",
      durationSeconds: 4.2,
      blobPath: "reply.wav",
      sampleRate: 24_000,
      format: "wav",
    });

    await expect(
      synthesizeSpokenResponse("I am listening.", "eng", synthesize),
    ).resolves.toEqual({
      url: "https://audio.test/reply.wav",
      durationSeconds: 4.2,
      mimeType: "audio/wav",
      language: "eng",
    });
    expect(synthesize).toHaveBeenCalledWith("I am listening.", "eng", 0.7);
  });

  it("does not expose unusable provider output", async () => {
    const synthesize = vi.fn().mockResolvedValue({
      audioUrl: "",
      durationSeconds: 0,
      blobPath: "",
      sampleRate: 24_000,
      format: "wav",
    });
    await expect(
      synthesizeSpokenResponse("Hello", "eng", synthesize),
    ).resolves.toBeUndefined();
  });
});

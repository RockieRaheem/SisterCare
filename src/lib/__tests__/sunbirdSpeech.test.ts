import { describe, expect, it, vi } from "vitest";
import {
  getSunbirdVoices,
  speechToText,
  textToSpeech,
} from "../sunbird";

describe("current Sunbird speech contracts", () => {
  it("uses the Orpheus voice contract without removed Spark fields", async () => {
    vi.stubEnv("SUNBIRD_API_KEY", "sunbird-test-key");
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      audio_url: "https://audio.test/luganda.wav",
      voice: "waxal_lug_0006",
      language: "lug",
      duration_seconds: 2.5,
      sample_rate: 24_000,
      gcs_object: "orpheus/luganda.wav",
    }), { status: 200, headers: { "content-type": "application/json" } }));

    await textToSpeech("Oli otya?", "lug", 0.7, "waxal_lug_0006", fetcher);

    const [, init] = fetcher.mock.calls[0];
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({
      text: "Oli otya?",
      voice: "waxal_lug_0006",
      language: "lug",
      response_mode: "url",
    });
    expect(body).not.toHaveProperty("model");
    vi.unstubAllEnvs();
  });

  it("does not send the removed platform field to transcription", async () => {
    vi.stubEnv("SUNBIRD_API_KEY", "sunbird-test-key");
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      audio_transcription: "Oli otya?",
      language: "lug",
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const audio = new File([new Uint8Array(1_024)], "voice.webm", {
      type: "audio/webm",
    });

    await speechToText(audio, "lug", fetcher);

    const [, init] = fetcher.mock.calls[0];
    const body = init.body as FormData;
    expect(body.get("language")).toBe("lug");
    expect(body.has("platform")).toBe(false);
    vi.unstubAllEnvs();
  });

  it("publishes only real selectable voices for each language", () => {
    expect(getSunbirdVoices("eng")).toHaveLength(3);
    expect(getSunbirdVoices("lug")).toHaveLength(8);
    expect(getSunbirdVoices("lgg")).toEqual([]);
  });
});

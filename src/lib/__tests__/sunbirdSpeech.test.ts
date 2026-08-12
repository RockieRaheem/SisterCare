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
      voice: "salt_lug_0001",
      language: "lug",
      duration_seconds: 2.5,
      sample_rate: 24_000,
      gcs_object: "orpheus/luganda.wav",
    }), { status: 200, headers: { "content-type": "application/json" } }));

    await textToSpeech("Oli otya?", "lug", 0.7, "salt_lug_0001", fetcher);

    const [, init] = fetcher.mock.calls[0];
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({
      text: "Oli otya?",
      voice: "salt_lug_0001",
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

  it("publishes exactly one approved voice per supported spoken language", () => {
    expect(getSunbirdVoices("eng")).toEqual([{ id: "salt_eng_0001", label: "English voice 1" }]);
    expect(getSunbirdVoices("lug")).toEqual([{ id: "salt_lug_0001", label: "Luganda female voice" }]);
    expect(getSunbirdVoices("ach")).toEqual([{ id: "waxal_ach_0008", label: "Acholi voice 5" }]);
    expect(getSunbirdVoices("lgg")).toEqual([]);
    expect(getSunbirdVoices("nyn")).toEqual([{ id: "waxal_nyn_0007", label: "Runyankole voice 4" }]);
    expect(getSunbirdVoices("teo")).toEqual([{ id: "salt_teo_0001", label: "Ateso voice 1" }]);
    expect(getSunbirdVoices("swa")).toEqual([{ id: "waxal_swa_0006", label: "Swahili voice 1" }]);
  });
});

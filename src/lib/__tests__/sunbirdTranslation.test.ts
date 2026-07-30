import { describe, expect, it } from "vitest";
import { parseSunbirdTranslation } from "../sunbird";

describe("Sunbird translation response validation", () => {
  it("accepts the current Sunflower translation response", () => {
    expect(
      parseSunbirdTranslation(
        {
          status: "COMPLETED",
          output: {
            translated_text: "Oli otya?",
            source_language: "eng",
            target_language: "lug",
          },
        },
        "How are you?",
        "eng",
        "lug",
      ),
    ).toBe("Oli otya?");
  });

  it("accepts a full target language name returned by the API", () => {
    expect(
      parseSunbirdTranslation(
        {
          output: {
            translated_text: "Ndi bulungi.",
            target_language: "Luganda",
          },
        },
        "I am okay.",
        "eng",
        "lug",
      ),
    ).toBe("Ndi bulungi.");
  });

  it("rejects empty, unchanged, truncated, and wrong-language output", () => {
    expect(() =>
      parseSunbirdTranslation({ output: {} }, "How are you?", "eng", "lug"),
    ).toThrow("no translated text");
    expect(() =>
      parseSunbirdTranslation(
        { output: { translated_text: "How are you?" } },
        "How are you?",
        "eng",
        "lug",
      ),
    ).toThrow("source text unchanged");
    expect(() =>
      parseSunbirdTranslation(
        { output: { translated_text: "Kitono" } },
        "This is a deliberately long source response containing important health instructions that must never be silently cut off during translation.",
        "eng",
        "lug",
      ),
    ).toThrow("incomplete translation");
    expect(() =>
      parseSunbirdTranslation(
        {
          output: {
            translated_text: "Oli otya?",
            target_language: "ach",
          },
        },
        "How are you?",
        "eng",
        "lug",
      ),
    ).toThrow("wrong target language");
  });
});

import { describe, expect, it } from "vitest";
import {
  normalizeSupportedLanguageCode,
  SUPPORTED_LANGUAGES,
} from "../sunbird";

describe("SisterCare language support", () => {
  it("exposes exactly the seven production speech languages", () => {
    expect(Object.keys(SUPPORTED_LANGUAGES)).toEqual([
      "eng",
      "lug",
      "ach",
      "lgg",
      "nyn",
      "teo",
      "swa",
    ]);
  });

  it.each([
    ["en", "eng"],
    ["English", "eng"],
    ["lg", "lug"],
    ["Oluganda", "lug"],
    ["Leb Acoli", "ach"],
    ["Lugbarati", "lgg"],
    ["Runyankore", "nyn"],
    ["Ateso", "teo"],
    ["sw", "swa"],
    ["Kiswahili", "swa"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeSupportedLanguageCode(input)).toBe(expected);
  });

  it("fails closed to English for unknown provider codes", () => {
    expect(normalizeSupportedLanguageCode("unsupported-language")).toBe("eng");
  });
});

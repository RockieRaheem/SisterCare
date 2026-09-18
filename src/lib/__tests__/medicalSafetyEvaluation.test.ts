import { describe, expect, it } from "vitest";
import { MEDICAL_SAFETY_EVALUATION_CASES, MEDICAL_SAFETY_EVALUATION_VERSION, evaluateMedicalSafetyCorpus } from "@/lib/medicalSafetyEvaluation";

describe("multilingual prohibited-medical-advice evaluation", () => {
  it("covers every language exposed by SisterCare", () => {
    expect(new Set(MEDICAL_SAFETY_EVALUATION_CASES.map((item) => item.language))).toEqual(new Set(["eng", "lug", "ach", "lgg", "nyn", "teo", "swa"]));
  });

  it("allows no prohibited dose instruction to escape", () => {
    expect(evaluateMedicalSafetyCorpus()).toEqual({ version: MEDICAL_SAFETY_EVALUATION_VERSION, total: 7, languages: 7, escaped: [] });
  });

  it("marks every phrase for independent native-speaker review", () => {
    expect(MEDICAL_SAFETY_EVALUATION_CASES.every((item) => item.linguisticReviewRequired)).toBe(true);
  });
});

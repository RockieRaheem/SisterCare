import { describe, expect, it } from "vitest";
import {
  assessMedicalRequest,
  assessMedicalOutput,
  enforceMedicalOutputBoundary,
  inferDoctorSpecialty,
  SAFE_MEDICAL_BOUNDARY_RESPONSE,
} from "@/lib/medicalSafety";

describe("medical output safety boundary", () => {
  it.each([
    "Take amoxicillin 500 mg twice daily for five days.",
    "Meza vidonge 2 vya dawa hii kila siku.",
    "Mira eddagala lino 10 mg buli lunaku.",
    "Use 5 ml every eight hours.",
    "Start this medication tonight.",
    "Stop your antibiotic immediately.",
    "You definitely have malaria.",
  ])("blocks prescribing or diagnosis: %s", (response) => {
    expect(assessMedicalOutput(response).safe).toBe(false);
  });

  it.each([
    ["eng", "Take the medicine at 500 mg."],
    ["lug", "Eddagala lino lya 500 mg."],
    ["ach", "Yat man 500 mg."],
    ["lgg", "Medicine 500 mg."],
    ["nyn", "Omubazi ogu 500 mg."],
    ["teo", "Medicine 500 mg."],
    ["swa", "Dawa hii 500 mg."],
  ])("applies the same dose boundary in %s", (_language, response) => {
    expect(assessMedicalOutput(response).violations).toContain(
      "dose_instruction",
    );
  });

  it("does not block general support, referrals, or non-medical numbers", () => {
    expect(
      assessMedicalOutput(
        "I can help you book a verified doctor. Try breathing slowly for 5 minutes while you wait.",
      ).safe,
    ).toBe(true);
  });

  it("replaces an unsafe answer with a fixed non-prescribing response", () => {
    expect(enforceMedicalOutputBoundary("Take 2 tablets now.")).toEqual({
      text: SAFE_MEDICAL_BOUNDARY_RESPONSE,
      blocked: true,
      violations: ["dose_instruction"],
    });
  });

  it.each([
    ["Please connect me to a doctor", "doctor_request"],
    ["Which medicine and dose should I take?", "prescription"],
    ["Niandikie dawa ya maumivu", "prescription"],
    ["Mpandiikire eddagala ly'omutwe", "prescription"],
    ["I have severe cramps, what should I do?", "medical_guidance"],
    ["Record my headache for today", "none"],
  ])("routes medical intent without model discretion: %s", (message, kind) => {
    expect(assessMedicalRequest(message)).toBe(kind);
  });

  it("selects a relevant doctor specialty without diagnosing", () => {
    expect(inferDoctorSpecialty("I need help with vaginal bleeding")).toBe(
      "Obstetrics & Gynaecology",
    );
    expect(inferDoctorSpecialty("I need a general doctor")).toBe(
      "General Practice",
    );
  });
});

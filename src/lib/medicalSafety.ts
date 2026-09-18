/**
 * Deterministic medical-safety boundary for generated text.
 *
 * This is intentionally independent of the model prompt and provider. A model
 * may explain approved health information, but it may never produce a
 * diagnosis or an instruction to start, stop, change, or dose medicine.
 */

export type MedicalOutputViolation =
  | "dose_instruction"
  | "prescription_instruction"
  | "medication_change"
  | "diagnosis_claim";

export interface MedicalOutputAssessment {
  safe: boolean;
  violations: MedicalOutputViolation[];
}

const DOSE_INSTRUCTION =
  /\b\d+(?:[.,]\d+)?\s*(?:mcg|μg|ug|mg|g|ml|mL|iu|units?|tablets?|tabs?|capsules?|caps?|pills?|drops?)\b/i;

// These patterns intentionally include the common medical words used in the
// supported languages. The unit-based rule above remains language-independent.
const PRESCRIPTION_INSTRUCTION =
  /\b(?:take|swallow|inject|apply|use|drink|insert|buy|meza|tumia)\b[\s\S]{0,80}\b(?:medicine|medication|drug|antibiotic|tablet|capsule|pill|dose|dawa|kidonge|vidonge|eddagala|omubazi|yat)\b|\b(?:niandikie|andika|mpandiikire|prescribe|i prescribe|you should take|you need to take|i recommend taking)\b/i;

const MEDICATION_CHANGE =
  /\b(?:start|stop|continue|increase|reduce|decrease|double|halve|switch|change)\b[\s\S]{0,55}\b(?:medicine|medication|drug|antibiotic|tablet|capsule|pill|dose|dawa|kidonge|vidonge|eddagala|omubazi|yat)\b/i;

const DIAGNOSIS_CLAIM =
  /\b(?:you have|you definitely have|this is|you are suffering from|i diagnose you with|your diagnosis is)\b[\s\S]{0,45}\b(?:cancer|malaria|hiv|aids|diabetes|hypertension|infection|pneumonia|meningitis|endometriosis|fibroids?|miscarriage|ectopic pregnancy|depression|bipolar disorder|psychosis|ptsd)\b/i;

export const SAFE_MEDICAL_BOUNDARY_RESPONSE =
  "I can’t diagnose you, prescribe medicine, choose a dose, or tell you to start or stop treatment. I can help you connect with a verified doctor for medical care. If you have severe or rapidly worsening symptoms, heavy bleeding, fainting, breathing difficulty, poisoning, or immediate danger, seek urgent in-person care now.";

export function assessMedicalOutput(text: string): MedicalOutputAssessment {
  const violations = new Set<MedicalOutputViolation>();
  if (DOSE_INSTRUCTION.test(text)) violations.add("dose_instruction");
  if (PRESCRIPTION_INSTRUCTION.test(text)) {
    violations.add("prescription_instruction");
  }
  if (MEDICATION_CHANGE.test(text)) violations.add("medication_change");
  if (DIAGNOSIS_CLAIM.test(text)) violations.add("diagnosis_claim");
  return { safe: violations.size === 0, violations: [...violations] };
}

export function enforceMedicalOutputBoundary(text: string): {
  text: string;
  blocked: boolean;
  violations: MedicalOutputViolation[];
} {
  const assessment = assessMedicalOutput(text);
  return assessment.safe
    ? { text, blocked: false, violations: [] }
    : {
        text: SAFE_MEDICAL_BOUNDARY_RESPONSE,
        blocked: true,
        violations: assessment.violations,
      };
}

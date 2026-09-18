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

export type MedicalRequestKind =
  | "none"
  | "doctor_request"
  | "prescription"
  | "medical_guidance";

export interface MedicalUrgencyAssessment {
  urgency: "routine" | "urgent" | "critical";
  reason: string;
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

const DOCTOR_REQUEST =
  /\b(?:connect|book|find|see|speak|talk|take|refer)\b[\s\S]{0,45}\b(?:doctor|physician|medical officer|clinic|hospital)\b|\b(?:doctor|physician)\b[\s\S]{0,35}\b(?:appointment|consultation|booking)\b/i;
const PRESCRIPTION_REQUEST =
  /\b(?:prescri(?:be|ption)|dosage?|dose|which medicine|what medicine|which drug|what drug|medicine should i|medication should i|antibiotic|niandikie dawa|mpandiikire eddagala)\b/i;
const MEDICAL_GUIDANCE_REQUEST =
  /\b(?:what should i do|how do i treat|how can i treat|what treatment|what causes|could this be|is this serious|medical advice|health advice)\b[\s\S]{0,80}\b(?:pain|bleed|bleeding|fever|vomit|dizzy|faint|infection|discharge|pregnan|symptom|headache|cramp|swelling|rash|wound)\w*|\b(?:pain|bleed|bleeding|fever|vomit|dizzy|faint|infection|discharge|pregnan|symptom|headache|cramp|swelling|rash|wound)\w*[\s\S]{0,80}\b(?:what should i do|how do i treat|what treatment|medical advice|health advice)\b/i;

export function assessMedicalRequest(text: string): MedicalRequestKind {
  if (DOCTOR_REQUEST.test(text)) return "doctor_request";
  if (PRESCRIPTION_REQUEST.test(text)) return "prescription";
  if (MEDICAL_GUIDANCE_REQUEST.test(text)) return "medical_guidance";
  return "none";
}

export function inferDoctorSpecialty(text: string): string {
  if (/pregnan|pelvic|period|menstru|vaginal|uter|ovari|contracept|abortion/i.test(text)) {
    return "Obstetrics & Gynaecology";
  }
  if (/mental|psychiatr|panic|hallucinat|depress|anxiety medication/i.test(text)) {
    return "Psychiatry";
  }
  if (/sexual|sti|std|hiv|reproductive/i.test(text)) {
    return "Sexual & Reproductive Health";
  }
  return "General Practice";
}

/**
 * Conservative red flags for immediate escalation. These rules must be
 * clinically reviewed and versioned; mentioning a topic such as abortion is
 * never, by itself, classified as a crisis.
 */
export function assessMedicalUrgency(text: string): MedicalUrgencyAssessment {
  const normalized = text.toLowerCase();
  if (/\b(?:overdose|poison(?:ed|ing)?|swallowed poison|took too many pills)\b/i.test(normalized)) {
    return { urgency: "critical", reason: "poisoning_or_overdose" };
  }
  if (/\b(?:cannot breathe|can't breathe|cant breathe|difficulty breathing|unconscious|not waking|seizure|convulsion)\b/i.test(normalized)) {
    return { urgency: "critical", reason: "airway_or_consciousness" };
  }
  if (/\b(?:heavy|uncontrolled|soaking|pouring)\b[\s\S]{0,35}\b(?:bleed|bleeding|blood)\b|\b(?:bleed|bleeding)\b[\s\S]{0,35}\b(?:faint|collapsed|unconscious)\b/i.test(normalized)) {
    return { urgency: "critical", reason: "severe_bleeding" };
  }
  if (/\b(?:pregnan\w*|positive pregnancy test)\b[\s\S]{0,90}\b(?:severe pain|heavy bleeding|faint|collapsed)\b/i.test(normalized)) {
    return { urgency: "critical", reason: "pregnancy_red_flag" };
  }
  if (/\b(?:forced abortion|forcing me to abort|inserted an object|heavy bleeding after (?:an )?abortion|unsafe abortion)\b/i.test(normalized)) {
    return { urgency: "critical", reason: "unsafe_procedure" };
  }
  if (/\b(?:severe pain|rapidly worsening|high fever|persistent vomiting)\b/i.test(normalized)) {
    return { urgency: "urgent", reason: "urgent_symptoms" };
  }
  return { urgency: "routine", reason: "no_red_flag_detected" };
}

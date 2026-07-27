import { CounsellorSpecialty, TriageSeverity } from "@/types";

const COUNSELLOR_REQUEST_PATTERN =
  /(counsellor|counselor|therapist|professional help|human support|talk to someone|connect me|i need help|i want a human|real help|i need real|speak to someone|real person|human help|mental health support|see a doctor|see a specialist)/i;
const CALL_REQUEST_PATTERN =
  /(call (them|her|him|counsellor|counselor)|phone (them|her|him|counsellor|counselor)|phone call|via (a )?phone call|dial|make (the )?call|make a call|call now|automatically call|auto.?call|cant you call|can't you call|call her for me|call him for me)/i;
const WHATSAPP_REQUEST_PATTERN =
  /(whatsapp|what'?s app|message (them|her|him|counsellor|counselor)|text (them|her|him|counsellor|counselor)|chat on whatsapp|connect.*whatsapp|if you cant|if you can't)/i;
const PRONOUN_REFERENCE_PATTERN =
  /(call her|call him|whatsapp her|whatsapp him|message (her|him|them)|text (her|him|them)|her number|his number|their number|contact (her|him|them)|reach (her|him|them))/i;

export interface HandoffPolicy {
  requestedCounsellor: boolean;
  requestedCall: boolean;
  requestedWhatsApp: boolean;
  referencesActiveCounsellor: boolean;
  shouldOfferHandoff: boolean;
  shouldAutoConnect: boolean;
}

export function evaluateHandoffPolicy(params: {
  message: string;
  severity: TriageSeverity;
  languageCode?: string;
}): HandoffPolicy {
  const requestedCounsellor =
    COUNSELLOR_REQUEST_PATTERN.test(params.message) ||
    (params.languageCode === "lug" &&
      /(njagala|nnyagala).*(kansala|counsellor|counselor|talk to someone|human help)/i.test(
        params.message,
      ));
  const requestedCall = CALL_REQUEST_PATTERN.test(params.message);
  const requestedWhatsApp = WHATSAPP_REQUEST_PATTERN.test(params.message);
  return {
    requestedCounsellor,
    requestedCall,
    requestedWhatsApp,
    referencesActiveCounsellor: PRONOUN_REFERENCE_PATTERN.test(params.message),
    shouldOfferHandoff: params.severity === "high",
    shouldAutoConnect:
      requestedCounsellor ||
      requestedCall ||
      requestedWhatsApp ||
      params.severity === "critical",
  };
}

export function inferCounsellorSpecialty(
  message: string,
): CounsellorSpecialty {
  const normalized = message.toLowerCase();
  if (/pregnan|postpartum|baby/i.test(normalized))
    return "Pregnancy & Postpartum";
  if (/diet|food|nutrition|weight/i.test(normalized))
    return "Nutrition & Wellness";
  if (/relationship|partner|marriage/i.test(normalized))
    return "Relationship Counselling";
  if (/sexual|sex|std|sti/i.test(normalized)) return "Sexual Health";
  if (/teen|adolescent|school girl|young girl/i.test(normalized))
    return "Adolescent Health";
  if (/period|menstrual|cycle|cramps|pms/i.test(normalized))
    return "Menstrual Health";
  return "Mental Health";
}

export function isActiveCounsellorReference(message: string): boolean {
  return PRONOUN_REFERENCE_PATTERN.test(message);
}


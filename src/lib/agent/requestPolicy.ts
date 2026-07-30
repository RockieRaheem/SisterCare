const SYSTEM_ACTION =
  /\b(log|record|save|track|update|change|set|remind|open|navigate|show|sign\s*out|log\s*out)\b/i;
const CLINICAL_SIGNAL =
  /\b(pain|hurt|ache|cramp|bleed|bleeding|discharge|fever|headache|migraine|nausea|vomit|dizzy|faint|infection|pregnan|period|menstru|fertil|ovulat|medicine|medication|dose|diagnos|treat|symptom|cause|cure|contracept|abortion)\w*/i;

export type AgentRequestPolicy =
  | { kind: "allowed" }
  | { kind: "clinical_guidance" }
  | { kind: "blocked_action"; warning: string };

/** Protect privileged data and identify requests requiring governed guidance. */
export function assessAgentRequestPolicy(message: string): AgentRequestPolicy {
  const normalized = message.trim();
  if (
    /\b(ignore|bypass|override|disable)\b[\s\S]{0,50}\b(security|safety|rules?|permissions?|authorization)\b/i.test(
      normalized,
    ) ||
    /\b(show|reveal|give|send)\b[\s\S]{0,40}\b(api\s*key|secret|password|access\s*token|service[_\s-]*role)\b/i.test(
      normalized,
    )
  ) {
    return {
      kind: "blocked_action",
      warning:
        "I can’t bypass SisterCare safeguards or reveal credentials. I can explain the permitted workflow or help with an authorised action instead.",
    };
  }
  if (
    /\b(make|set|promote|grant|approve|verify|change)\b[\s\S]{0,50}\b(admin|administrator|counsellor|kyc|role|privilege|permission)\b/i.test(
      normalized,
    )
  ) {
    return {
      kind: "blocked_action",
      warning:
        "I can’t grant roles, approve KYC, or change privileged permissions. Those actions require an authorised administrator and an auditable review.",
    };
  }
  if (
    /\b(delete|erase|remove|change|open|read)\b[\s\S]{0,45}\b(another user|other user|someone else|their account|all users|database)\b/i.test(
      normalized,
    )
  ) {
    return {
      kind: "blocked_action",
      warning:
        "I can only work with your own authorised SisterCare data. I can’t access or alter another person’s account or system records.",
    };
  }
  if (CLINICAL_SIGNAL.test(normalized) && !SYSTEM_ACTION.test(normalized)) {
    return { kind: "clinical_guidance" };
  }
  return { kind: "allowed" };
}

const CLINICAL_TOOLS = new Set([
  "analyze_symptoms",
  "assess_risk_level",
  "search_health_info",
  "get_personalized_tips",
  "generate_health_report",
]);

export function isToolAllowedByClinicalPolicy(
  toolName: string,
  clinicalGuidanceAllowed: boolean,
): boolean {
  return clinicalGuidanceAllowed || !CLINICAL_TOOLS.has(toolName);
}

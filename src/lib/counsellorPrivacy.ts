const EMAIL_PATTERN =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN =
  /(?<!\w)(?:\+?\d[\s().-]*){7,15}(?!\w)/g;
const INTRODUCED_NAME_PATTERN =
  /\b(?:my name is|i am called|call me)\s+[\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*){0,3}/giu;

export type CounsellorContextScope =
  | "none"
  | "member_approved"
  | "safety_minimum";

export interface CounsellorContextDecision {
  summary: string;
  scope: CounsellorContextScope;
  includeConversationReference: boolean;
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function sanitizeCounsellorSummary(
  value: unknown,
  memberIdentityValues: Array<string | null | undefined> = [],
): string {
  const source =
    typeof value === "string" && value.trim()
      ? value
      : "Member requested a counselling session";

  let summary = source
    .replace(EMAIL_PATTERN, "[private email]")
    .replace(PHONE_PATTERN, "[private number]")
    .replace(INTRODUCED_NAME_PATTERN, "the member");

  for (const identity of memberIdentityValues) {
    const normalized = identity?.trim();
    if (!normalized || normalized.length < 3) continue;
    summary = summary.replace(
      new RegExp(escapeRegularExpression(normalized), "giu"),
      "the member",
    );
  }

  return summary
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

export function resolveCounsellorContext(params: {
  policy: "ask_each_time" | "approved_summary" | "never";
  explicitSummaryConsent?: boolean;
  reason: "user_request" | "risk_detected";
  requestedSummary: unknown;
  memberIdentityValues?: Array<string | null | undefined>;
}): CounsellorContextDecision {
  if (params.reason === "risk_detected") {
    return {
      summary:
        "Urgent safety support requested after SisterCare detected a critical risk signal.",
      scope: "safety_minimum",
      includeConversationReference: false,
    };
  }

  const mayShare =
    params.policy === "approved_summary" ||
    (params.policy === "ask_each_time" && params.explicitSummaryConsent === true);

  if (!mayShare || params.policy === "never") {
    return {
      summary: "Member requested a counselling session without sharing chat context.",
      scope: "none",
      includeConversationReference: false,
    };
  }

  return {
    summary: sanitizeCounsellorSummary(
      params.requestedSummary,
      params.memberIdentityValues,
    ),
    scope: "member_approved",
    includeConversationReference: false,
  };
}

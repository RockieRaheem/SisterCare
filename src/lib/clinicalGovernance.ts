/**
 * Clinical content governance.
 *
 * This registry deliberately does not pretend that engineering review is
 * clinical approval. Production approval requires a named reviewer and a
 * future review date. Until then, content remains usable in development and
 * controlled pilots, while the strict production gate reports it as blocked.
 */

export type ClinicalContentKind =
  | "health_article"
  | "crisis_response"
  | "risk_rule";

export type ClinicalRiskLevel = "low" | "moderate" | "high" | "critical";
export type ClinicalReviewStatus =
  | "requires_clinical_review"
  | "approved"
  | "withdrawn";

export interface ClinicalContentGovernance {
  id: string;
  kind: ClinicalContentKind;
  version: string;
  riskLevel: ClinicalRiskLevel;
  country: "UG";
  languages: string[];
  ownerRole: string;
  evidenceSources: string[];
  reviewStatus: ClinicalReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewDueAt?: string;
  changeSummary: string;
}

const ARTICLE_IDS = [
  "menstrual-cycle-basics",
  "period-pain",
  "heavy-periods",
  "irregular-periods",
  "pms-pmdd",
  "fertility-basics",
  "pregnancy-signs",
  "abnormal-bleeding",
  "vaginal-discharge",
  "period-nutrition",
  "period-anxiety",
  "menstrual-hygiene",
] as const;

const CRISIS_IDS = [
  "familyAbuse",
  "selfHarm",
  "harassment",
  "danger",
  "generalAbuse",
  "violence",
] as const;

const ARTICLE_EVIDENCE = [
  "WHO self-care interventions for health and well-being",
  "Uganda Ministry of Health clinical guidance",
];

const CRISIS_EVIDENCE = [
  "Uganda National Child Helpline service information",
  "WHO guidance for suicide prevention and crisis response",
];

export const CLINICAL_CONTENT_REGISTRY: ClinicalContentGovernance[] = [
  ...ARTICLE_IDS.map(
    (id): ClinicalContentGovernance => ({
      id,
      kind: "health_article",
      version: "1.0.0",
      riskLevel:
        id === "pregnancy-signs" ||
        id === "abnormal-bleeding" ||
        id === "heavy-periods"
          ? "high"
          : "moderate",
      country: "UG",
      languages: ["en"],
      ownerRole: "clinical-content-owner",
      evidenceSources: ARTICLE_EVIDENCE,
      reviewStatus: "requires_clinical_review",
      changeSummary: "Baseline content imported into governed registry",
    }),
  ),
  ...CRISIS_IDS.map(
    (id): ClinicalContentGovernance => ({
      id: `crisis.${id}`,
      kind: "crisis_response",
      version: "1.0.0",
      riskLevel: "critical",
      country: "UG",
      languages: ["en"],
      ownerRole: "safeguarding-owner",
      evidenceSources: CRISIS_EVIDENCE,
      reviewStatus: "requires_clinical_review",
      changeSummary: "Baseline crisis response imported into governed registry",
    }),
  ),
  {
    id: "risk.crisis-patterns",
    kind: "risk_rule",
    version: "1.0.0",
    riskLevel: "critical",
    country: "UG",
    languages: ["en", "lg", "sw"],
    ownerRole: "safeguarding-owner",
    evidenceSources: CRISIS_EVIDENCE,
    reviewStatus: "requires_clinical_review",
    changeSummary: "Baseline deterministic crisis lexicon",
  },
];

export interface GovernanceIssue {
  id: string;
  code:
    | "duplicate_id"
    | "missing_metadata"
    | "missing_content"
    | "unregistered_content"
    | "approval_required"
    | "review_expired";
  message: string;
}

function isValidDate(value?: string): boolean {
  return Boolean(value && !Number.isNaN(new Date(value).getTime()));
}

export function validateClinicalGovernance(
  contentIds: string[],
  options: { requireProductionApproval?: boolean; now?: Date } = {},
): GovernanceIssue[] {
  const issues: GovernanceIssue[] = [];
  const now = options.now ?? new Date();
  const registryIds = new Set<string>();

  for (const record of CLINICAL_CONTENT_REGISTRY) {
    if (registryIds.has(record.id)) {
      issues.push({
        id: record.id,
        code: "duplicate_id",
        message: `Clinical governance id "${record.id}" is duplicated`,
      });
    }
    registryIds.add(record.id);

    if (
      !record.version ||
      !record.ownerRole ||
      record.languages.length === 0 ||
      record.evidenceSources.length === 0 ||
      !record.changeSummary
    ) {
      issues.push({
        id: record.id,
        code: "missing_metadata",
        message: `Clinical governance metadata is incomplete for "${record.id}"`,
      });
    }

    if (options.requireProductionApproval) {
      if (
        record.reviewStatus !== "approved" ||
        !record.reviewedBy ||
        !isValidDate(record.reviewedAt) ||
        !isValidDate(record.reviewDueAt)
      ) {
        issues.push({
          id: record.id,
          code: "approval_required",
          message: `Clinical approval is required for "${record.id}"`,
        });
      } else if (new Date(record.reviewDueAt!).getTime() <= now.getTime()) {
        issues.push({
          id: record.id,
          code: "review_expired",
          message: `Clinical approval has expired for "${record.id}"`,
        });
      }
    }
  }

  for (const id of contentIds) {
    if (!registryIds.has(id)) {
      issues.push({
        id,
        code: "unregistered_content",
        message: `Clinical content "${id}" has no governance record`,
      });
    }
  }

  const knownContent = new Set(contentIds);
  for (const record of CLINICAL_CONTENT_REGISTRY) {
    if (!knownContent.has(record.id)) {
      issues.push({
        id: record.id,
        code: "missing_content",
        message: `Governance record "${record.id}" has no matching content`,
      });
    }
  }

  return issues;
}

export function getClinicalGovernanceRecord(
  id: string,
): ClinicalContentGovernance | null {
  return CLINICAL_CONTENT_REGISTRY.find((record) => record.id === id) ?? null;
}


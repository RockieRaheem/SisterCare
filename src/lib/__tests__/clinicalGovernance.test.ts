import { describe, expect, it } from "vitest";
import { HEALTH_KNOWLEDGE_BASE } from "@/lib/agent/knowledge";
import { CRISIS_RESPONSES } from "@/lib/safety";
import {
  CLINICAL_CONTENT_REGISTRY,
  getClinicalRuntimeIssues,
  validateClinicalGovernance,
} from "@/lib/clinicalGovernance";

function governedContentIds(): string[] {
  return [
    ...HEALTH_KNOWLEDGE_BASE.map((article) => article.id),
    ...Object.keys(CRISIS_RESPONSES).map((id) => `crisis.${id}`),
    "risk.crisis-patterns",
  ];
}

describe("clinical content governance", () => {
  it("registers every clinical content asset with complete metadata", () => {
    expect(validateClinicalGovernance(governedContentIds())).toEqual([]);
  });

  it("uses unique, versioned governance records", () => {
    const ids = CLINICAL_CONTENT_REGISTRY.map((record) => record.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const record of CLINICAL_CONTENT_REGISTRY) {
      expect(record.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(record.ownerRole).not.toBe("");
      expect(record.evidenceSources.length).toBeGreaterThan(0);
    }
  });

  it("fails the production gate until real clinical approval is recorded", () => {
    const issues = validateClinicalGovernance(governedContentIds(), {
      requireProductionApproval: true,
      now: new Date("2026-07-27T00:00:00.000Z"),
    });
    expect(issues.length).toBe(CLINICAL_CONTENT_REGISTRY.length);
    expect(issues.every((issue) => issue.code === "approval_required")).toBe(
      true,
    );
  });

  it("requires a production attestation for every exact content version", () => {
    const approvals = CLINICAL_CONTENT_REGISTRY.map((record) => ({
      id: record.id,
      version: record.version,
      reviewedBy: "Dr Amina Reviewer, licence 12345",
      reviewedAt: "2026-07-01",
      reviewDueAt: "2027-07-01",
    }));
    expect(getClinicalRuntimeIssues({
      NODE_ENV: "production",
      CLINICAL_APPROVALS_JSON: JSON.stringify(approvals),
    }, new Date("2026-07-29T00:00:00.000Z"))).toEqual([]);

    const mismatched = [...approvals];
    mismatched[0] = { ...mismatched[0], version: "0.0.1" };
    expect(getClinicalRuntimeIssues({
      NODE_ENV: "production",
      CLINICAL_APPROVALS_JSON: JSON.stringify(mismatched),
    }, new Date("2026-07-29T00:00:00.000Z")).some((issue) => issue.code === "approval_version_mismatch")).toBe(true);
  });

  it("does not impose the production gate on development or controlled pilots", () => {
    expect(getClinicalRuntimeIssues({ NODE_ENV: "development" })).toEqual([]);
  });
});

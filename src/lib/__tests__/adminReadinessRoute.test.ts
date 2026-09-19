import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  authorizationFailure: vi.fn(),
  database: vi.fn(),
  maintenance: vi.fn(),
  safetyCoverage: vi.fn(),
  clinicalIssues: vi.fn(),
}));

vi.mock("../serverAuth", () => ({
  isAuthEnforced: () => true,
  authenticateRequest: mocks.authenticate,
  getAuthorizationFailure: mocks.authorizationFailure,
}));
vi.mock("../observability", () => ({
  withApiObservability: (_name: string, handler: unknown) => handler,
}));
vi.mock("../server/operations", () => ({
  getDatabaseReadinessReport: mocks.database,
  getMaintenanceReadinessReport: mocks.maintenance,
  getSafetyCoverageReadiness: mocks.safetyCoverage,
}));
vi.mock("../clinicalGovernance", () => ({
  getClinicalRuntimeIssues: mocks.clinicalIssues,
}));

import { GET } from "@/app/api/admin/readiness/route";

const request = () => new NextRequest("https://sistercare.test/api/admin/readiness", {
  headers: { authorization: "Bearer test-token" },
});

describe("admin readiness diagnostics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticate.mockResolvedValue({ status: "verified", uid: "admin-1", token: { role: "admin" } });
    mocks.authorizationFailure.mockReturnValue(null);
    mocks.database.mockResolvedValue({ ready: false, failedChecks: ["table:doctor_prescriptions"] });
    mocks.maintenance.mockResolvedValue({ ready: false, failedJobs: ["session_sweep"] });
    mocks.safetyCoverage.mockResolvedValue(false);
    mocks.clinicalIssues.mockReturnValue([{ id: "risk.medical-output-firewall", code: "approval_required", message: "Private detail" }]);
  });

  it("does not expose diagnostics to a non-admin", async () => {
    mocks.authorizationFailure.mockReturnValueOnce({ status: 403, error: "Administrator access required" });
    const response = await GET(request());
    expect(response.status).toBe(403);
    expect(mocks.database).not.toHaveBeenCalled();
  });

  it("returns only safe probe names and clinical review identifiers", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body = await response.json();
    expect(body.data).toEqual({
      database: { ready: false, failedChecks: ["table:doctor_prescriptions"] },
      maintenance: { ready: false, failedJobs: ["session_sweep"] },
      safetyCoverage: false,
      clinicalIssues: [{ id: "risk.medical-output-firewall", code: "approval_required" }],
    });
    expect(JSON.stringify(body)).not.toContain("Private detail");
  });
});

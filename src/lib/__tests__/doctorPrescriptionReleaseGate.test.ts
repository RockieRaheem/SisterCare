import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  authorizeDoctor: vi.fn(),
  clinicalIssues: vi.fn(),
  issue: vi.fn(),
  list: vi.fn(),
  validate: vi.fn(),
  withdraw: vi.fn(),
}));

vi.mock("../serverAuth", () => ({
  isAuthEnforced: () => true,
  authenticateRequest: mocks.authenticate,
  authorizeDoctor: mocks.authorizeDoctor,
  getAuthorizationFailure: () => null,
}));
vi.mock("../clinicalGovernance", () => ({
  getClinicalRuntimeIssues: mocks.clinicalIssues,
}));
vi.mock("../server/doctorCare", () => ({
  issueDoctorPrescription: mocks.issue,
  listPrescriptions: mocks.list,
  validatePrescriptionDraft: mocks.validate,
  voidDoctorPrescription: mocks.withdraw,
}));

import { GET, PATCH, POST } from "@/app/api/doctor/prescriptions/route";

const id = "11111111-1111-4111-8111-111111111111";
function request(method: "GET" | "POST" | "PATCH", body?: unknown) {
  return new NextRequest("https://sistercare.test/api/doctor/prescriptions", {
    method,
    headers: { authorization: "Bearer doctor-token", "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe("doctor prescription release gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticate.mockResolvedValue({ status: "verified", uid: "doctor-1", token: { role: "doctor" } });
    mocks.authorizeDoctor.mockResolvedValue({ status: "authorized", role: "doctor" });
    mocks.clinicalIssues.mockReturnValue([{ id: "risk.medical-output-firewall" }]);
    mocks.validate.mockReturnValue({ valid: true, value: { clinicalAttestation: true } });
    mocks.issue.mockResolvedValue({ id });
    mocks.list.mockResolvedValue([{ id }]);
    mocks.withdraw.mockResolvedValue({ id, status: "voided" });
  });

  it("blocks new prescriptions while clinical governance is incomplete", async () => {
    const response = await POST(request("POST", { appointmentId: id }));
    expect(response.status).toBe(503);
    expect(mocks.issue).not.toHaveBeenCalled();
  });

  it("allows issuance only after the clinical release gate passes", async () => {
    mocks.clinicalIssues.mockReturnValue([]);
    const response = await POST(request("POST", { appointmentId: id }));
    expect(response.status).toBe(201);
    expect(mocks.issue).toHaveBeenCalledOnce();
  });

  it("keeps existing records readable and withdrawable during a pause", async () => {
    expect((await GET(request("GET"))).status).toBe(200);
    expect((await PATCH(request("PATCH", { prescriptionId: id, reason: "Withdrawn after review" }))).status).toBe(200);
    expect(mocks.withdraw).toHaveBeenCalledOnce();
  });
});

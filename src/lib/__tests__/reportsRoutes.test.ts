import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  authFailure: vi.fn(),
  enforced: vi.fn(),
  quota: vi.fn(),
  from: vi.fn(),
}));

vi.mock("../serverAuth", () => ({
  authenticateRequest: mocks.auth,
  getAuthorizationFailure: mocks.authFailure,
  isAuthEnforced: mocks.enforced,
}));
vi.mock("../server/rateLimit", () => ({ consumeRateLimit: mocks.quota }));
vi.mock("../supabaseAdmin", () => ({ getSupabaseAdmin: () => ({ from: mocks.from }) }));
vi.mock("../observability", () => ({ withApiObservability: (_name: string, handler: unknown) => handler }));

import { POST as createReport } from "@/app/api/reports/route";
import { PATCH as updateReport } from "@/app/api/admin/reports/route";

function request(url: string, body: unknown) {
  return new NextRequest(`https://sistercare.test${url}`, {
    method: "POST",
    headers: { authorization: "Bearer token", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("member concern reporting", () => {
  beforeEach(() => {
    mocks.auth.mockReset(); mocks.authFailure.mockReset(); mocks.enforced.mockReset(); mocks.quota.mockReset(); mocks.from.mockReset();
    mocks.enforced.mockReturnValue(true);
    mocks.auth.mockResolvedValue({ status: "verified", uid: "member-1", token: { uid: "member-1", role: "user" } });
    mocks.authFailure.mockReturnValue(null);
    mocks.quota.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  });

  it("rejects incomplete reports before writing data", async () => {
    const response = await createReport(request("/api/reports", { targetType: "other", category: "other", description: "short" }));
    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("stores only the authenticated member as the reporter", async () => {
    const insert = vi.fn().mockReturnValue({ select: () => ({ single: vi.fn().mockResolvedValue({ data: { id: "10000000-0000-0000-0000-000000000001", status: "open", created_at: "2026-08-19T00:00:00Z" }, error: null }) }) });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockImplementation((table: string) => table === "member_concern_reports" ? { insert } : { insert: auditInsert });

    const response = await createReport(request("/api/reports", { targetType: "ai_response", targetId: "conversation-1", category: "incorrect_information", description: "This answer gave information that should be reviewed." }));

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ reporter_id: "member-1", target_type: "ai_response" }));
    expect(auditInsert).toHaveBeenCalled();
  });
});

describe("administrator report review", () => {
  beforeEach(() => {
    mocks.auth.mockReset(); mocks.authFailure.mockReset(); mocks.enforced.mockReset(); mocks.from.mockReset();
    mocks.enforced.mockReturnValue(true);
    mocks.auth.mockResolvedValue({ status: "verified", uid: "admin-1", token: { uid: "admin-1", role: "admin" } });
    mocks.authFailure.mockReturnValue(null);
  });

  it("requires an accountable note before closing a report", async () => {
    const response = await updateReport(request("/api/admin/reports", { reportId: "report-1", status: "resolved", resolutionNote: "too short" }));
    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("assigns the administrator and records the closure", async () => {
    const select = vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "report-1" }, error: null }) });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockImplementation((table: string) => table === "member_concern_reports" ? { update } : { insert: auditInsert });

    const response = await updateReport(request("/api/admin/reports", { reportId: "report-1", status: "resolved", resolutionNote: "Reviewed the response and corrected the unsafe content." }));

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "resolved", assigned_to: "admin-1" }));
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({ event_type: "member_report.resolved" }));
  });
});

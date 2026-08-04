import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  authorizeCounsellor: vi.fn(),
  authorizationFailure: vi.fn(),
  createSessionRequest: vi.fn(),
  isAuthEnforced: vi.fn(),
  listCounsellor: vi.fn(),
  listMember: vi.fn(),
}));

vi.mock("../serverAuth", () => ({
  authenticateRequest: mocks.auth,
  authorizeCounsellor: mocks.authorizeCounsellor,
  getAuthorizationFailure: mocks.authorizationFailure,
  isAuthEnforced: mocks.isAuthEnforced,
  hasRole: (
    auth: { token?: { role?: string } },
    role: string,
  ) => auth.token?.role === role,
}));

vi.mock("../server/sessions", () => ({
  createSessionRequest: mocks.createSessionRequest,
  listSessionsForUser: mocks.listMember,
  listSessionsForCounsellor: mocks.listCounsellor,
}));

import { GET, POST } from "@/app/api/sessions/route";

function post(body: unknown) {
  return new NextRequest("https://sistercare.test/api/sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/sessions", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.isAuthEnforced.mockReturnValue(true);
    mocks.authorizationFailure.mockReturnValue(null);
    mocks.auth.mockResolvedValue({
      status: "verified",
      uid: "member-1",
      token: { uid: "member-1", role: "user" },
    });
  });

  it("does not let a member self-assign crisis priority", async () => {
    mocks.createSessionRequest.mockResolvedValue({ id: "session-1" });

    const response = await POST(
      post({
        summary: "  I would like someone to talk to  ",
        priority: "crisis",
        shareSummary: true,
        preferredCounsellorId: "5e8b9a10-a61d-4cc0-bb84-08944b643499",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.createSessionRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "member-1",
        reason: "user_request",
        priority: "normal",
        summary: "I would like someone to talk to",
        explicitSummaryConsent: true,
      }),
    );
  });

  it("rejects an invalid preferred counsellor identifier before matching", async () => {
    const response = await POST(
      post({ preferredCounsellorId: "not-a-database-id" }),
    );

    expect(response.status).toBe(400);
    expect(mocks.createSessionRequest).not.toHaveBeenCalled();
  });

  it("lists only the signed-in member's sessions by default", async () => {
    mocks.listMember.mockResolvedValue([{ id: "owned-session" }]);

    const response = await GET(
      new NextRequest("https://sistercare.test/api/sessions"),
    );

    expect(response.status).toBe(200);
    expect(mocks.listMember).toHaveBeenCalledWith("member-1");
    expect(mocks.listCounsellor).not.toHaveBeenCalled();
  });

  it("requires verified professional access for counsellor workspace queries", async () => {
    mocks.authorizeCounsellor.mockResolvedValue({
      status: "forbidden",
      reason: "verification_required",
    });

    const response = await GET(
      new NextRequest(
        "https://sistercare.test/api/sessions?workspace=counsellor",
      ),
    );

    expect(response.status).toBe(403);
    expect(mocks.listCounsellor).not.toHaveBeenCalled();
  });

  it("uses the professional session view after verification", async () => {
    mocks.auth.mockResolvedValue({
      status: "verified",
      uid: "counsellor-1",
      token: { uid: "counsellor-1", role: "counsellor" },
    });
    mocks.authorizeCounsellor.mockResolvedValue({
      status: "authorized",
      uid: "counsellor-1",
    });
    mocks.listCounsellor.mockResolvedValue({
      sessions: [{ id: "assigned-session" }],
      incoming: [],
    });

    const response = await GET(
      new NextRequest("https://sistercare.test/api/sessions"),
    );

    expect(response.status).toBe(200);
    expect(mocks.listCounsellor).toHaveBeenCalledWith("counsellor-1");
    expect(mocks.listMember).not.toHaveBeenCalled();
  });
});

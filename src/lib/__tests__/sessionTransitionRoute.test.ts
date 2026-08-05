import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  acceptSession: vi.fn(),
  authorizeCounsellor: vi.fn(),
  authenticateRequest: vi.fn(),
  declineSession: vi.fn(),
}));

vi.mock("../serverAuth", () => ({
  authenticateRequest: mocks.authenticateRequest,
  authorizeCounsellor: mocks.authorizeCounsellor,
  isAuthEnforced: () => true,
}));

vi.mock("../server/sessions", () => ({
  acceptSession: mocks.acceptSession,
  cancelSession: vi.fn(),
  declineSession: mocks.declineSession,
  endSession: vi.fn(),
  escalateSession: vi.fn(),
  submitFeedback: vi.fn(),
}));

import { CounsellorEligibilityError } from "../counsellorOperations";
import { POST } from "@/app/api/sessions/[id]/transition/route";

function request(action: string) {
  return new NextRequest(
    "https://sistercare.test/api/sessions/session-1/transition",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    },
  );
}

const context = {
  params: Promise.resolve({ id: "session-1" }),
};

describe("POST /api/sessions/:id/transition", () => {
  beforeEach(() => {
    mocks.acceptSession.mockReset();
    mocks.authorizeCounsellor.mockReset();
    mocks.authenticateRequest.mockReset();
    mocks.declineSession.mockReset();
    mocks.authenticateRequest.mockResolvedValue({
      status: "verified",
      uid: "counsellor-1",
      token: { uid: "counsellor-1", role: "counsellor" },
    });
    mocks.authorizeCounsellor.mockResolvedValue({
      status: "authorized",
      uid: "counsellor-1",
    });
  });

  it("returns the activated session after a successful acceptance", async () => {
    mocks.acceptSession.mockResolvedValue({
      id: "session-1",
      state: "active",
      audioReady: false,
    });

    const response = await POST(request("accept"), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        session: { id: "session-1", state: "active" },
      },
    });
  });

  it("returns actionable eligibility guidance instead of an internal error", async () => {
    mocks.acceptSession.mockRejectedValue(
      new CounsellorEligibilityError(["credentials_expired"]),
    );

    const response = await POST(request("accept"), context);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining("credential has expired"),
    });
  });

  it("returns a retryable conflict when the presence heartbeat expired", async () => {
    mocks.acceptSession.mockRejectedValue(
      new Error("Counsellor must be signed in to accept a session"),
    );

    const response = await POST(request("accept"), context);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "Counsellor must be signed in to accept a session",
    });
  });

  it("releases a declined request for rematching", async () => {
    mocks.declineSession.mockResolvedValue(undefined);

    const response = await POST(request("decline"), context);

    expect(response.status).toBe(200);
    expect(mocks.declineSession).toHaveBeenCalledWith(
      "session-1",
      "counsellor-1",
    );
    await expect(response.json()).resolves.toMatchObject({ success: true });
  });

  it("returns a conflict if a decline races another session action", async () => {
    mocks.declineSession.mockRejectedValue(
      new Error("Session changed before it could be declined"),
    );

    const response = await POST(request("decline"), context);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "Session changed before it could be declined",
    });
  });
});

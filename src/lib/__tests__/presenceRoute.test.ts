import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  authorizeCounsellor: vi.fn(),
  authorizationFailure: vi.fn(),
  isAuthEnforced: vi.fn(),
  recordHeartbeat: vi.fn(),
  setOffline: vi.fn(),
}));

vi.mock("../serverAuth", () => ({
  authenticateRequest: mocks.auth,
  authorizeCounsellor: mocks.authorizeCounsellor,
  getAuthorizationFailure: mocks.authorizationFailure,
  isAuthEnforced: mocks.isAuthEnforced,
}));

vi.mock("../server/sessions", () => ({
  recordHeartbeat: mocks.recordHeartbeat,
  setOffline: mocks.setOffline,
}));

import { CounsellorEligibilityError } from "../counsellorOperations";
import { POST } from "@/app/api/presence/route";

function request(status: unknown) {
  return new NextRequest("https://sistercare.test/api/presence", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

describe("POST /api/presence", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.isAuthEnforced.mockReturnValue(true);
    mocks.authorizationFailure.mockReturnValue(null);
    mocks.auth.mockResolvedValue({
      status: "verified",
      uid: "counsellor-1",
      token: { uid: "counsellor-1", role: "counsellor" },
    });
    mocks.authorizeCounsellor.mockResolvedValue({
      status: "authorized",
      uid: "counsellor-1",
    });
  });

  it("requires a currently verified counsellor before changing presence", async () => {
    mocks.authorizeCounsellor.mockResolvedValue({
      status: "forbidden",
      reason: "verification_required",
    });

    const response = await POST(request("available"));

    expect(response.status).toBe(403);
    expect(mocks.recordHeartbeat).not.toHaveBeenCalled();
    expect(mocks.setOffline).not.toHaveBeenCalled();
  });

  it("rejects every status except available and offline", async () => {
    const response = await POST(request("in_session"));

    expect(response.status).toBe(400);
    expect(mocks.recordHeartbeat).not.toHaveBeenCalled();
  });

  it("records an available heartbeat and returns the effective live status", async () => {
    mocks.recordHeartbeat.mockResolvedValue({
      drained: 1,
      status: "in_session",
    });

    const response = await POST(request("available"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { drained: 1, status: "in_session" },
    });
    expect(mocks.recordHeartbeat).toHaveBeenCalledWith(
      "counsellor-1",
      "available",
    );
  });

  it("sets offline explicitly without trying to match a waiting member", async () => {
    mocks.setOffline.mockResolvedValue(undefined);

    const response = await POST(request("offline"));

    expect(response.status).toBe(200);
    expect(mocks.setOffline).toHaveBeenCalledWith("counsellor-1");
    expect(mocks.recordHeartbeat).not.toHaveBeenCalled();
  });

  it("returns an actionable reason when operations make a counsellor ineligible", async () => {
    mocks.recordHeartbeat.mockRejectedValue(
      new CounsellorEligibilityError(["credentials_expired"]),
    );

    const response = await POST(request("available"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining("credential has expired"),
    });
  });
});

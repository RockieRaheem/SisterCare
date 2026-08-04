import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  authorizationFailure: vi.fn(),
  from: vi.fn(),
  isAuthEnforced: vi.fn(),
}));

vi.mock("../serverAuth", () => ({
  authenticateRequest: mocks.auth,
  getAuthorizationFailure: mocks.authorizationFailure,
  isAuthEnforced: mocks.isAuthEnforced,
}));

vi.mock("../supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({ from: mocks.from }),
}));

import { POST } from "@/app/api/profile/onboarding/route";

function request(body: unknown) {
  return new NextRequest("https://sistercare.test/api/profile/onboarding", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/profile/onboarding", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.authorizationFailure.mockReset();
    mocks.from.mockReset();
    mocks.isAuthEnforced.mockReset();
    mocks.isAuthEnforced.mockReturnValue(true);
    mocks.auth.mockResolvedValue({
      status: "verified",
      uid: "member-1",
      token: { uid: "member-1", role: "user" },
    });
    mocks.authorizationFailure.mockReturnValue(null);
  });

  it("persists skip as a completed member decision", async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq: updateEq }));
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              role: "member",
              registration_intent: "member",
              preferences: {},
            },
            error: null,
          }),
        }),
      }),
      update,
    });

    const response = await POST(request({ mode: "skip" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { onboardingCompleted: true, reminderScheduled: false },
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ onboarding_completed: true }),
    );
    expect(updateEq).toHaveBeenCalledWith("id", "member-1");
  });

  it("never applies member onboarding to a counsellor applicant", async () => {
    const update = vi.fn();
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              role: "member",
              registration_intent: "counsellor",
              preferences: {},
            },
            error: null,
          }),
        }),
      }),
      update,
    });

    const response = await POST(request({ mode: "skip" }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: "Member profile setup is not available for this account.",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("returns a retryable conflict while the auth profile trigger catches up", async () => {
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const response = await POST(request({ mode: "skip" }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining("not ready"),
    });
  });

  it("rejects malformed or unsafe cycle setup before any database write", async () => {
    const response = await POST(
      request({
        mode: "complete",
        lastPeriodDate: "2999-01-01",
        cycleLength: 28,
        periodLength: 5,
        reminderDays: 3,
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

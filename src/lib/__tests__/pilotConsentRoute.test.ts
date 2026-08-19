import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { CONTROLLED_PILOT } from "../pilot";

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  from: vi.fn(),
}));

vi.mock("../supabaseAdmin", () => ({
  verifySupabaseAccessToken: mocks.verify,
  getSupabaseAdmin: () => ({ from: mocks.from }),
}));

import { POST } from "@/app/api/profile/pilot-consent/route";

function request(body: unknown, authenticated = true) {
  return new NextRequest("https://sistercare.test/api/profile/pilot-consent", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authenticated ? { authorization: "Bearer pilot-token" } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/profile/pilot-consent", () => {
  beforeEach(() => {
    mocks.verify.mockReset();
    mocks.from.mockReset();
    mocks.verify.mockResolvedValue({ user: { id: "member-1" }, error: null });
  });

  it("requires both authentication and the current consent version", async () => {
    expect((await POST(request({}, false))).status).toBe(401);
    expect((await POST(request({ adultConfirmed: true, consentVersion: "old" }))).status).toBe(400);
    expect(mocks.verify).not.toHaveBeenCalled();
  });

  it("refuses to apply member consent to a professional workspace", async () => {
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({
            data: { role: "member", registration_intent: "counsellor" },
            error: null,
          }),
        }),
      }),
    });

    const response = await POST(request({
      adultConfirmed: true,
      consentVersion: CONTROLLED_PILOT.consentVersion,
    }));

    expect(response.status).toBe(403);
  });

  it("records consent and a matching audit event", async () => {
    const profileSingle = vi.fn().mockResolvedValue({
      data: { role: "member", registration_intent: "member" },
      error: null,
    });
    const profileEq = vi.fn().mockResolvedValue({ error: null });
    const profileUpdate = vi.fn(() => ({ eq: profileEq }));
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({ eq: () => ({ single: profileSingle }) }),
          update: profileUpdate,
        };
      }
      return { insert: auditInsert };
    });

    const response = await POST(request({
      adultConfirmed: true,
      consentVersion: CONTROLLED_PILOT.consentVersion,
    }));

    expect(response.status).toBe(200);
    expect(profileUpdate).toHaveBeenCalledWith(expect.objectContaining({
      adult_confirmed: true,
      pilot_consent_version: CONTROLLED_PILOT.consentVersion,
    }));
    expect(profileEq).toHaveBeenCalledWith("id", "member-1");
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      event_type: "pilot.consent_recorded",
      actor_id: "member-1",
    }));
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { CONTROLLED_PILOT } from "../pilot";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  profileMaybe: vi.fn(),
  applicationMaybe: vi.fn(),
  profileUpdate: vi.fn(),
  profileInsert: vi.fn(),
  auditInsert: vi.fn(),
  getUserById: vi.fn(),
  updateUserById: vi.fn(),
}));

vi.mock("../serverAuth", () => ({
  authenticateRequest: mocks.authenticate,
}));
vi.mock("../observability", () => ({
  withApiObservability: (_name: string, handler: unknown) => handler,
}));
vi.mock("../supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: mocks.profileMaybe }) }),
          update: mocks.profileUpdate,
          insert: mocks.profileInsert,
        };
      }
      if (table === "counsellor_applications") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: mocks.applicationMaybe }) }),
        };
      }
      return { insert: mocks.auditInsert };
    },
    auth: {
      admin: {
        getUserById: mocks.getUserById,
        updateUserById: mocks.updateUserById,
      },
    },
  }),
}));

import { POST } from "@/app/api/auth/oauth-profile/route";

function request(body: unknown) {
  return new NextRequest("https://sistercare.test/api/auth/oauth-profile", {
    method: "POST",
    headers: { authorization: "Bearer google-token", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const signupBody = {
  mode: "signup",
  registrationIntent: "counsellor",
  pilotConsent: {
    adultConfirmed: true,
    consentVersion: CONTROLLED_PILOT.consentVersion,
  },
};

describe("POST /api/auth/oauth-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticate.mockResolvedValue({
      status: "verified",
      uid: "google-user",
      token: { uid: "google-user", email: "person@example.com" },
    });
    mocks.profileMaybe.mockResolvedValue({
      data: {
        role: "member",
        registration_intent: "member",
        display_name: null,
        photo_url: null,
        created_at: new Date().toISOString(),
      },
      error: null,
    });
    mocks.applicationMaybe.mockResolvedValue({ data: null, error: null });
    mocks.getUserById.mockResolvedValue({
      data: {
        user: {
          id: "google-user",
          email: "person@example.com",
          created_at: new Date().toISOString(),
          user_metadata: { full_name: "Google Person", avatar_url: "https://example.com/photo.jpg" },
        },
      },
      error: null,
    });
    mocks.profileUpdate.mockImplementation(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }));
    mocks.profileInsert.mockResolvedValue({ error: null });
    mocks.updateUserById.mockResolvedValue({ error: null });
    mocks.auditInsert.mockResolvedValue({ error: null });
  });

  it("requires an authenticated Google session and current signup consent", async () => {
    mocks.authenticate.mockResolvedValueOnce({ status: "unauthenticated" });
    expect((await POST(request(signupBody))).status).toBe(401);
    expect((await POST(request({ ...signupBody, pilotConsent: null }))).status).toBe(400);
  });

  it("records consent and counsellor intent for a new Google account", async () => {
    const response = await POST(request(signupBody));
    expect(response.status).toBe(200);
    expect(mocks.profileUpdate).toHaveBeenCalledWith(expect.objectContaining({
      registration_intent: "counsellor",
      adult_confirmed: true,
      pilot_consent_version: CONTROLLED_PILOT.consentVersion,
    }));
    expect(mocks.updateUserById).toHaveBeenCalledWith(
      "google-user",
      expect.objectContaining({
        user_metadata: expect.objectContaining({ registration_intent: "counsellor" }),
      }),
    );
  });

  it("never rewrites the role or account type of a returning administrator", async () => {
    mocks.profileMaybe.mockResolvedValueOnce({
      data: {
        role: "admin",
        registration_intent: "member",
        display_name: "Admin",
        photo_url: null,
        created_at: "2025-01-01T00:00:00.000Z",
      },
      error: null,
    });
    mocks.getUserById.mockResolvedValueOnce({
      data: {
        user: {
          id: "google-user",
          email: "admin@example.com",
          created_at: "2025-01-01T00:00:00.000Z",
          user_metadata: {},
        },
      },
      error: null,
    });

    expect((await POST(request(signupBody))).status).toBe(200);
    expect(mocks.profileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ registration_intent: "member" }),
    );
    expect(mocks.profileUpdate.mock.calls[0][0]).not.toHaveProperty("role");
  });
});

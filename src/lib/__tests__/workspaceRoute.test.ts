import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  from: vi.fn(),
  getUserById: vi.fn(),
  updateUserById: vi.fn(),
}));

vi.mock("../serverAuth", () => ({
  authenticateRequest: mocks.auth,
}));

vi.mock("../supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({
    from: mocks.from,
    auth: {
      admin: {
        getUserById: mocks.getUserById,
        updateUserById: mocks.updateUserById,
      },
    },
  }),
}));

vi.mock("../observability", () => ({
  withApiObservability: (
    _name: string,
    handler: (request: NextRequest) => Promise<Response>,
  ) => handler,
}));

import { POST } from "@/app/api/auth/workspace/route";

function request(requestedIntent?: "member" | "counsellor") {
  return new NextRequest("https://sistercare.test/api/auth/workspace", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requestedIntent }),
  });
}

function database(input: {
  profile: Record<string, unknown> | null;
  application?: Record<string, unknown> | null;
}) {
  const updateEqRole = vi.fn().mockResolvedValue({ error: null });
  const updateEqId = vi.fn(() => ({ eq: updateEqRole }));
  const update = vi.fn(() => ({ eq: updateEqId }));
  mocks.from.mockImplementation((table: string) => {
    const data =
      table === "profiles" ? input.profile : input.application || null;
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update,
    };
  });
  return { update };
}

describe("POST /api/auth/workspace", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.auth.mockResolvedValue({
      status: "verified",
      uid: "account-1",
      token: { uid: "account-1", email: "person@example.com" },
    });
    mocks.getUserById.mockResolvedValue({
      data: {
        user: {
          id: "account-1",
          email: "person@example.com",
          user_metadata: { registration_intent: "member" },
        },
      },
      error: null,
    });
    mocks.updateUserById.mockResolvedValue({ error: null });
  });

  it("always routes an administrator to the admin workspace", async () => {
    database({
      profile: {
        role: "admin",
        registration_intent: "member",
        onboarding_completed: true,
      },
    });

    const response = await POST(request("member"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        destination: "/admin",
        role: "admin",
        registrationIntent: "member",
      },
    });
  });

  it("does not convert an established member through a counsellor login choice", async () => {
    const { update } = database({
      profile: {
        role: "member",
        registration_intent: "member",
        onboarding_completed: true,
      },
    });

    const response = await POST(request("counsellor"));

    await expect(response.json()).resolves.toMatchObject({
      data: {
        destination: "/dashboard",
        role: "member",
        registrationIntent: "member",
      },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("preserves counsellor identity when a KYC application exists", async () => {
    database({
      profile: {
        role: "member",
        registration_intent: "member",
        onboarding_completed: false,
      },
      application: { status: "pending" },
    });

    const response = await POST(request("member"));

    await expect(response.json()).resolves.toMatchObject({
      data: {
        destination: "/counsellor",
        role: "member",
        registrationIntent: "counsellor",
        applicationStatus: "pending",
      },
    });
  });

  it("rejects a request when the access token is not verified", async () => {
    mocks.auth.mockResolvedValue({
      status: "unauthenticated",
      reason: "invalid_token",
    });

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.getUserById).not.toHaveBeenCalled();
  });
});

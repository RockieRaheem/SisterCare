import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("../supabaseAdmin", () => ({
  verifySupabaseAccessToken: async (token: string) => {
    const result = await mocks.getUser(token);
    return { user: result.data.user, error: result.error };
  },
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mocks.maybeSingle }),
      }),
    }),
  }),
}));

import { authenticateRequest } from "../serverAuth";

describe("request authentication", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.maybeSingle.mockReset();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "person@example.com" } },
      error: null,
    });
  });

  it("distinguishes a rejected JWT from a server verification failure", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid JWT") });

    const result = await authenticateRequest(new Request("https://sistercare.test/api", {
      headers: { Authorization: "Bearer rejected-token" },
    }));

    expect(result).toEqual({ status: "unauthenticated", reason: "invalid_token" });
  });

  it("keeps a verified identity authenticated while its profile is repaired", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await authenticateRequest(new Request("https://sistercare.test/api", {
      headers: { Authorization: "Bearer valid-token" },
    }));

    expect(result).toEqual({
      status: "verified",
      uid: "user-1",
      token: { uid: "user-1", email: "person@example.com", role: undefined },
    });
  });

  it("maps the stored member role to the API user role", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { role: "member" }, error: null });

    const result = await authenticateRequest(new Request("https://sistercare.test/api", {
      headers: { Authorization: "Bearer valid-token" },
    }));

    expect(result.status).toBe("verified");
    if (result.status === "verified") expect(result.token.role).toBe("user");
  });
});

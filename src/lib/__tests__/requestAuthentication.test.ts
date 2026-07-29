import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("../supabaseAdmin", () => ({
  createSupabaseUserClient: () => ({ auth: { getUser: mocks.getUser } }),
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mocks.maybeSingle }),
      }),
    }),
  }),
}));

import { authenticateRequest } from "../firebaseAdmin";

describe("request authentication", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.maybeSingle.mockReset();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "person@example.com" } },
      error: null,
    });
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

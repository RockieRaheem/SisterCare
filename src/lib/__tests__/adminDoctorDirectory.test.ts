import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  authorizationFailure: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
}));

vi.mock("../serverAuth", () => ({
  isAuthEnforced: () => true,
  authenticateRequest: mocks.authenticate,
  getAuthorizationFailure: mocks.authorizationFailure,
}));
vi.mock("../supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({ from: mocks.from }),
}));
vi.mock("../observability", () => ({
  withApiObservability: (_name: string, handler: unknown) => handler,
}));

import { GET } from "@/app/api/admin/doctors/route";

const request = () => new NextRequest("https://sistercare.test/api/admin/doctors", {
  headers: { authorization: "Bearer admin-token" },
});

describe("admin doctor directory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticate.mockResolvedValue({ status: "verified", uid: "admin-1", token: { role: "admin" } });
    mocks.authorizationFailure.mockReturnValue(null);
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ order: mocks.order });
    mocks.order.mockResolvedValue({ data: [{ id: "doctor-1", profiles: { email: "doctor@example.test" } }], error: null });
  });

  it("selects the doctor's profile rather than the verifying administrator", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith("doctors");
    expect(mocks.select).toHaveBeenCalledWith(expect.stringContaining("profiles:profiles!doctors_id_fkey(email)"));
    expect((await response.json()).data.doctors[0].profiles.email).toBe("doctor@example.test");
  });

  it("does not expose the doctor directory to a non-admin", async () => {
    mocks.authorizationFailure.mockReturnValueOnce({ status: 403, error: "Administrator access required" });
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

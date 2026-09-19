import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => ({
  response: { data: [] as Record<string, unknown>[], error: null as null | { code?: string; message: string } },
  select: vi.fn(),
  eq: vi.fn(),
  signedUrl: vi.fn(),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({ select: query.select }),
    storage: { from: () => ({ createSignedUrl: query.signedUrl }) },
  }),
}));

import { listVerifiedDoctors } from "@/lib/server/doctorCare";

describe("public doctor directory", () => {
  beforeEach(() => {
    query.response = { data: [], error: null };
    query.select.mockReset().mockReturnValue({ eq: query.eq });
    query.eq.mockReset().mockImplementation(async () => query.response);
    query.signedUrl.mockReset().mockResolvedValue({ data: { signedUrl: "https://photos.example/signed" }, error: null });
  });

  it("reads with a schema-tolerant projection and only publishes current credentials", async () => {
    query.response.data = [
      { id: "expired", professional_name: "Dr Expired", verification_status: "verified", credential_expires_at: "2020-01-01", registration_number: "private" },
      { id: "current", professional_name: "Dr Current", title: "Doctor", verification_status: "verified", credential_expires_at: "2099-01-01", registration_number: "private", status: "available", accepting_appointments: true, last_heartbeat_at: new Date().toISOString() },
    ];
    const doctors = await listVerifiedDoctors();
    expect(query.select).toHaveBeenCalledWith("*");
    expect(query.eq).toHaveBeenCalledWith("verification_status", "verified");
    expect(doctors).toHaveLength(1);
    expect(doctors[0].id).toBe("current");
    expect(doctors[0]).not.toHaveProperty("registration_number");
  });

  it("fails closed on a database error", async () => {
    query.response.error = { code: "42501", message: "permission denied" };
    await expect(listVerifiedDoctors()).rejects.toThrow("Doctor directory query failed (42501)");
  });

  it("returns a signed headshot only for the verified doctor's own path", async () => {
    const id = "22bf84b0-d8df-4878-a61d-8d7cb004848b";
    query.response.data = [{ id, professional_name: "Dr Current", verification_status: "verified", credential_expires_at: "2099-01-01", profile_photo_path: `${id}/profile-41167402-8b81-4b89-a187-2f92b3c94f51.jpg` }];
    const doctors = await listVerifiedDoctors();
    expect(doctors[0].photoURL).toBe("https://photos.example/signed");
    expect(doctors[0]).not.toHaveProperty("profile_photo_path");
    expect(query.signedUrl).toHaveBeenCalledOnce();
  });
});

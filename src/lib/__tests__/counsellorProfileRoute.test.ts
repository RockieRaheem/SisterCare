import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  authorizeCounsellor: vi.fn(),
  isAuthEnforced: vi.fn(),
  maybeSingle: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  insert: vi.fn(),
  removePhoto: vi.fn(),
  resolvePhoto: vi.fn(),
}));

const query = {
  select: mocks.select,
  update: mocks.update,
  eq: mocks.eq,
  maybeSingle: mocks.maybeSingle,
};

vi.mock("../serverAuth", () => ({
  authenticateRequest: mocks.authenticateRequest,
  authorizeCounsellor: mocks.authorizeCounsellor,
  isAuthEnforced: mocks.isAuthEnforced,
}));

vi.mock("../supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) =>
      table === "audit_events" ? { insert: mocks.insert } : query,
  }),
}));

vi.mock("../server/counsellorPhotos", () => ({
  removeOwnedCounsellorPhoto: mocks.removePhoto,
  resolveCounsellorPhotoUrl: mocks.resolvePhoto,
}));

import { PATCH } from "@/app/api/counsellor/profile/route";

const body = {
  name: "Dr Amina",
  title: "Mental health counsellor",
  bio: "Private and non-judgmental professional support.",
  languages: ["English", "Luganda"],
  specializations: ["Mental Health"],
  photoURL: null,
};

describe("PATCH /api/counsellor/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthEnforced.mockReturnValue(true);
    mocks.authenticateRequest.mockResolvedValue({
      status: "verified",
      uid: "counsellor-1",
      token: { uid: "counsellor-1", role: "counsellor" },
    });
    mocks.authorizeCounsellor.mockResolvedValue({
      status: "authorized",
      role: "counsellor",
      repaired: false,
    });
    mocks.select.mockReturnValue(query);
    mocks.update.mockReturnValue(query);
    mocks.eq.mockReturnValue(query);
    mocks.insert.mockResolvedValue({ error: null });
    mocks.removePhoto.mockResolvedValue(true);
    mocks.resolvePhoto.mockResolvedValue("");
  });

  it("fails closed before accessing profile storage", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      status: "unauthenticated",
      reason: "missing_token",
    });

    const response = await PATCH(
      new NextRequest("https://sistercare.test/api/counsellor/profile", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });

  it("updates only editable fields and preserves controlled profile data", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({
        data: {
          verification_status: "verified",
          profile: {
            name: "Old name",
            title: "Counsellor",
            bio: "An existing professional biography.",
            languages: ["English"],
            specializations: ["Mental Health"],
            photoURL: "counsellor-1/profile-old.jpg",
            rating: 4.8,
            reviewCount: 12,
            availableHours: { start: "08:00", end: "17:00", days: [] },
            credentialType: "Licence",
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: { id: "counsellor-1" }, error: null });

    const response = await PATCH(
      new NextRequest("https://sistercare.test/api/counsellor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          rating: 5,
          reviewCount: 999,
          verificationStatus: "suspended",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      profile: expect.objectContaining({
        name: "Dr Amina",
        rating: 4.8,
        reviewCount: 12,
        credentialType: "Licence",
        photoURL: "",
      }),
    });
    expect(mocks.removePhoto).toHaveBeenCalledWith(
      expect.anything(),
      "counsellor-1",
      "counsellor-1/profile-old.jpg",
    );
  });

  it("rejects a photo path owned by another account", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: {
        verification_status: "verified",
        profile: { photoURL: "counsellor-1/profile-old.jpg" },
      },
      error: null,
    });

    const response = await PATCH(
      new NextRequest("https://sistercare.test/api/counsellor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          photoURL: "another-account/profile.jpg",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

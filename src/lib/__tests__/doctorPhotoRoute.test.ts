import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  doctorAccess: { status: "authorized", role: "doctor" },
  savedPhoto: { path: "doctor/profile.jpg", url: "https://photos.example/signed" },
  saveDoctorPhoto: vi.fn(),
  resolveDoctorPhotoUrl: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/lib/serverAuth", () => ({
  isAuthEnforced: () => true,
  authenticateRequest: async () => ({ status: "verified", uid: "doctor-1" }),
  authorizeDoctor: async () => mocks.doctorAccess,
}));
vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => table === "doctors"
      ? { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) }) }
      : { insert: vi.fn().mockResolvedValue({ error: null }) },
  }),
}));
vi.mock("@/lib/server/doctorPhotos", () => ({
  saveDoctorPhoto: mocks.saveDoctorPhoto,
  resolveDoctorPhotoUrl: mocks.resolveDoctorPhotoUrl,
  removeDoctorPhoto: vi.fn(),
}));

import { GET, POST } from "@/app/api/doctor/profile/photo/route";

describe("doctor headshot API", () => {
  beforeEach(() => {
    mocks.doctorAccess = { status: "authorized", role: "doctor" };
    mocks.saveDoctorPhoto.mockReset().mockResolvedValue(mocks.savedPhoto);
    mocks.resolveDoctorPhotoUrl.mockReset().mockResolvedValue(mocks.savedPhoto.url);
    mocks.maybeSingle.mockReset().mockResolvedValue({ data: { profile_photo_path: "doctor-1/profile.jpg" }, error: null });
  });

  it("rejects other roles before reading a doctor photo", async () => {
    mocks.doctorAccess = { status: "denied", role: "member" };
    const response = await GET(new NextRequest("https://sistercare.test/api/doctor/profile/photo"));
    expect(response.status).toBe(403);
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });

  it("serves a verified doctor's signed photo without exposing the storage path", async () => {
    const response = await GET(new NextRequest("https://sistercare.test/api/doctor/profile/photo"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: { photoURL: mocks.savedPhoto.url } });
  });

  it("allows the verified doctor to replace their headshot", async () => {
    const form = new FormData();
    form.set("photo", new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], "headshot.jpg", { type: "image/jpeg" }));
    const response = await POST(new NextRequest("https://sistercare.test/api/doctor/profile/photo", { method: "POST", body: form }));
    expect(response.status).toBe(200);
    expect(mocks.saveDoctorPhoto).toHaveBeenCalledOnce();
  });
});

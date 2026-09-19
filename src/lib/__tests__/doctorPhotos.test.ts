import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isOwnedDoctorPhotoPath, resolveDoctorPhotoUrl, saveDoctorPhoto, validDoctorPhoto } from "@/lib/server/doctorPhotos";

const id = "22bf84b0-d8df-4878-a61d-8d7cb004848b";
const path = `${id}/profile-41167402-8b81-4b89-a187-2f92b3c94f51.jpg`;

describe("private doctor headshots", () => {
  it("accepts only a doctor's own generated photo path", () => {
    expect(isOwnedDoctorPhotoPath(path, id)).toBe(true);
    expect(isOwnedDoctorPhotoPath(path, "another-doctor")).toBe(false);
    expect(isOwnedDoctorPhotoPath(`${id}/../licence.pdf`, id)).toBe(false);
    expect(isOwnedDoctorPhotoPath("https://example.com/photo.jpg", id)).toBe(false);
  });

  it("checks image bytes as well as the claimed MIME type", () => {
    expect(validDoctorPhoto(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), "image/jpeg")).toBe(true);
    expect(validDoctorPhoto(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]), "image/png")).toBe(true);
    expect(validDoctorPhoto(new Uint8Array([0x25, 0x50, 0x44, 0x46]), "image/jpeg")).toBe(false);
    expect(validDoctorPhoto(new Uint8Array(3 * 1024 * 1024 + 1), "image/jpeg")).toBe(false);
  });

  it("does not sign an unowned or malformed path", async () => {
    const createSignedUrl = vi.fn();
    const db = { storage: { from: () => ({ createSignedUrl }) } } as unknown as SupabaseClient;
    expect(await resolveDoctorPhotoUrl(db, id, "other/photo.jpg")).toBe("");
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("keeps the doctor directory usable during a storage outage", async () => {
    const db = { storage: { from: () => ({ createSignedUrl: vi.fn().mockRejectedValue(new Error("storage unavailable")) }) } } as unknown as SupabaseClient;
    expect(await resolveDoctorPhotoUrl(db, id, path)).toBe("");
  });

  it("rolls back an uploaded photo if the verified record cannot be updated", async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    const upload = vi.fn().mockResolvedValue({ error: null });
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const db = {
      storage: { from: () => ({ upload, remove }) },
      from: () => ({ update: () => ({ eq: () => ({ eq: () => ({ select: () => ({ maybeSingle }) }) }) }) }),
    } as unknown as SupabaseClient;
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], "doctor.jpg", { type: "image/jpeg" });
    await expect(saveDoctorPhoto(db, id, file, null)).rejects.toThrow("could not be saved");
    expect(upload).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
  });
});

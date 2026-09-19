import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "doctor-profile";
const MAX_BYTES = 3 * 1024 * 1024;
const SIGNED_URL_SECONDS = 60 * 60;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isOwnedDoctorPhotoPath(value: unknown, doctorId: string): value is string {
  if (typeof value !== "string" || !value.startsWith(`${doctorId}/`)) return false;
  return /^profile-[0-9a-f-]{36}\.(?:jpg|png|webp)$/.test(value.slice(doctorId.length + 1));
}

export function validDoctorPhoto(bytes: Uint8Array, mime: string): boolean {
  if (!EXTENSIONS[mime] || bytes.length === 0 || bytes.length > MAX_BYTES) return false;
  if (mime === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  return bytes.length > 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

export async function resolveDoctorPhotoUrl(db: SupabaseClient, doctorId: string, path: unknown): Promise<string> {
  if (!isOwnedDoctorPhotoPath(path, doctorId)) return "";
  try {
    const result = await db.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
    return result.error ? "" : result.data?.signedUrl || "";
  } catch {
    // A photo outage must not hide credential-verified doctors or live status.
    return "";
  }
}

export async function saveDoctorPhoto(db: SupabaseClient, doctorId: string, file: File, previousPath: unknown): Promise<{ path: string; url: string }> {
  if (file.size > MAX_BYTES || !EXTENSIONS[file.type]) throw new Error("Choose a JPG, PNG or WebP photo up to 3 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validDoctorPhoto(bytes, file.type)) throw new Error("The selected file is not a valid supported image.");
  const path = `${doctorId}/profile-${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
  const uploaded = await db.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploaded.error) throw new Error("The photo could not be uploaded.");
  const updated = await db.from("doctors").update({ profile_photo_path: path }).eq("id", doctorId).eq("verification_status", "verified").select("id").maybeSingle();
  if (updated.error || !updated.data) {
    await db.storage.from(BUCKET).remove([path]);
    throw new Error("The photo could not be saved to your profile.");
  }
  if (isOwnedDoctorPhotoPath(previousPath, doctorId)) await db.storage.from(BUCKET).remove([previousPath]);
  return { path, url: await resolveDoctorPhotoUrl(db, doctorId, path) };
}

export async function removeDoctorPhoto(db: SupabaseClient, doctorId: string, path: unknown): Promise<void> {
  const result = await db.from("doctors").update({ profile_photo_path: null }).eq("id", doctorId).eq("verification_status", "verified").select("id").maybeSingle();
  if (result.error || !result.data) throw new Error("The photo could not be removed from your profile.");
  if (isOwnedDoctorPhotoPath(path, doctorId)) await db.storage.from(BUCKET).remove([path]);
}

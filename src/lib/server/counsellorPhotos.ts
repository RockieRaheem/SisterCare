import type { SupabaseClient } from "@supabase/supabase-js";
import { isOwnedCounsellorPhotoPath } from "@/lib/counsellorProfile";

const PHOTO_URL_TTL_SECONDS = 60 * 60;

export async function resolveCounsellorPhotoUrl(
  db: SupabaseClient,
  counsellorId: string,
  storedValue: unknown,
): Promise<string> {
  if (typeof storedValue !== "string" || !storedValue.trim()) return "";
  if (/^https:\/\//i.test(storedValue)) return storedValue;
  if (!isOwnedCounsellorPhotoPath(storedValue, counsellorId)) return "";

  const signed = await db.storage
    .from("counsellor-profile")
    .createSignedUrl(storedValue, PHOTO_URL_TTL_SECONDS);
  return signed.error ? "" : signed.data?.signedUrl || "";
}

export async function removeOwnedCounsellorPhoto(
  db: SupabaseClient,
  counsellorId: string,
  storedValue: unknown,
): Promise<boolean> {
  if (!isOwnedCounsellorPhotoPath(storedValue, counsellorId)) return false;
  const result = await db.storage
    .from("counsellor-profile")
    .remove([storedValue]);
  return !result.error;
}

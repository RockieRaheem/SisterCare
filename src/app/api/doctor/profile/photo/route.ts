import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authorizeDoctor, isAuthEnforced } from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { removeDoctorPhoto, resolveDoctorPhotoUrl, saveDoctorPhoto } from "@/lib/server/doctorPhotos";

async function doctorPhotoAccess(request: NextRequest): Promise<{ uid: string } | { error: NextResponse }> {
  if (!isAuthEnforced()) return { error: NextResponse.json({ success: false, error: "Doctor profiles are unavailable" }, { status: 503 }) };
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") return { error: NextResponse.json({ success: false, error: "Authentication required" }, { status: auth.status === "unavailable" ? 503 : 401 }) };
  const access = await authorizeDoctor(auth);
  if (access.status !== "authorized" || access.role !== "doctor") return { error: NextResponse.json({ success: false, error: access.status === "unavailable" ? "Doctor verification is temporarily unavailable" : "Verified doctor access required" }, { status: access.status === "unavailable" ? 503 : 403 }) };
  return { uid: auth.uid };
}

async function storedPhoto(uid: string) {
  const result = await getSupabaseAdmin().from("doctors").select("profile_photo_path").eq("id", uid).eq("verification_status", "verified").maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data) throw new Error("Verified doctor profile not found");
  return result.data.profile_photo_path;
}

export async function GET(request: NextRequest) {
  const access = await doctorPhotoAccess(request);
  if ("error" in access) return access.error;
  try {
    const path = await storedPhoto(access.uid);
    return NextResponse.json({ success: true, data: { photoURL: await resolveDoctorPhotoUrl(getSupabaseAdmin(), access.uid, path) } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "Doctor profile photo could not be loaded" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const access = await doctorPhotoAccess(request);
  if ("error" in access) return access.error;
  try {
    const form = await request.formData();
    const file = form.get("photo");
    if (!(file instanceof File)) return NextResponse.json({ success: false, error: "Choose a profile photo" }, { status: 400 });
    const previousPath = await storedPhoto(access.uid);
    const photo = await saveDoctorPhoto(getSupabaseAdmin(), access.uid, file, previousPath);
    await getSupabaseAdmin().from("audit_events").insert({ actor_id: access.uid, subject_id: access.uid, event_type: "doctor.photo_updated", metadata: {} });
    return NextResponse.json({ success: true, data: { photoURL: photo.url } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Profile photo could not be saved";
    const inputError = message.startsWith("Choose a ") || message.startsWith("The selected file");
    return NextResponse.json({ success: false, error: inputError ? message : "Profile photo could not be saved. Please try again." }, { status: inputError ? 400 : 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const access = await doctorPhotoAccess(request);
  if ("error" in access) return access.error;
  try {
    const path = await storedPhoto(access.uid);
    await removeDoctorPhoto(getSupabaseAdmin(), access.uid, path);
    await getSupabaseAdmin().from("audit_events").insert({ actor_id: access.uid, subject_id: access.uid, event_type: "doctor.photo_removed", metadata: {} });
    return NextResponse.json({ success: true, data: { photoURL: "" } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "Profile photo could not be removed" }, { status: 503 });
  }
}

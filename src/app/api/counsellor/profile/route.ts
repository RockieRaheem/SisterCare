import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  authorizeCounsellor,
  isAuthEnforced,
} from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  CounsellorProfileValidationError,
  parseCounsellorProfileUpdate,
} from "@/lib/counsellorProfile";
import {
  removeOwnedCounsellorPhoto,
  resolveCounsellorPhotoUrl,
} from "@/lib/server/counsellorPhotos";

type StoredProfile = Record<string, unknown>;
type RouteAccess =
  | { uid: string }
  | { response: NextResponse };

async function authorize(request: NextRequest): Promise<RouteAccess> {
  if (!isAuthEnforced()) {
    return {
      response: NextResponse.json(
        { success: false, error: "Counsellor profiles are unavailable" },
        { status: 503 },
      ),
    };
  }
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") {
    return {
      response: NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: auth.status === "unavailable" ? 503 : 401 },
      ),
    };
  }
  const access = await authorizeCounsellor(auth);
  if (access.status !== "authorized" || access.role !== "counsellor") {
    return {
      response: NextResponse.json(
        {
          success: false,
          error:
            access.status === "unavailable"
              ? "Counsellor verification is temporarily unavailable"
              : "Verified counsellor access required",
        },
        { status: access.status === "unavailable" ? 503 : 403 },
      ),
    };
  }
  return { uid: auth.uid };
}

async function loadStoredProfile(uid: string) {
  const result = await getSupabaseAdmin()
    .from("counsellors")
    .select("profile, verification_status")
    .eq("id", uid)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data || result.data.verification_status !== "verified") {
    return null;
  }
  return (result.data.profile || {}) as StoredProfile;
}

export async function GET(request: NextRequest) {
  const access = await authorize(request);
  if ("response" in access) return access.response;
  try {
    const profile = await loadStoredProfile(access.uid);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Verified counsellor profile not found" },
        { status: 404 },
      );
    }
    const photoUrl = await resolveCounsellorPhotoUrl(
      getSupabaseAdmin(),
      access.uid,
      profile.photoURL,
    );
    return NextResponse.json(
      {
        success: true,
        data: {
          profile: {
            name: profile.name || "",
            title: profile.title || "",
            bio: profile.bio || "",
            languages: Array.isArray(profile.languages) ? profile.languages : [],
            specializations: Array.isArray(profile.specializations)
              ? profile.specializations
              : [],
            photoURL:
              typeof profile.photoURL === "string" ? profile.photoURL : null,
            photoPreviewUrl: photoUrl,
          },
        },
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Counsellor profile load failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not load your professional profile" },
      { status: 503 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const access = await authorize(request);
  if ("response" in access) return access.response;
  try {
    const current = await loadStoredProfile(access.uid);
    if (!current) {
      return NextResponse.json(
        { success: false, error: "Verified counsellor profile not found" },
        { status: 404 },
      );
    }
    const body = await request.json().catch(() => ({}));
    const editable = parseCounsellorProfileUpdate(
      body,
      access.uid,
      current.photoURL,
    );
    const db = getSupabaseAdmin();
    const updatedProfile = {
      ...current,
      ...editable,
      photoURL: editable.photoURL || "",
    };
    const updated = await db
      .from("counsellors")
      .update({ profile: updatedProfile })
      .eq("id", access.uid)
      .eq("verification_status", "verified")
      .select("id")
      .maybeSingle();
    if (updated.error) throw new Error(updated.error.message);
    if (!updated.data) {
      return NextResponse.json(
        { success: false, error: "Verified counsellor profile not found" },
        { status: 404 },
      );
    }

    if (
      current.photoURL &&
      current.photoURL !== editable.photoURL
    ) {
      const removed = await removeOwnedCounsellorPhoto(
        db,
        access.uid,
        current.photoURL,
      );
      if (!removed) {
        console.warn("Previous counsellor profile photo could not be removed");
      }
    }
    await db.from("audit_events").insert({
      actor_id: access.uid,
      event_type: "counsellor.profile_updated",
      subject_id: access.uid,
      metadata: {
        fields: [
          "name",
          "title",
          "bio",
          "languages",
          "specializations",
          "photoURL",
        ],
      },
    });
    const photoPreviewUrl = await resolveCounsellorPhotoUrl(
      db,
      access.uid,
      editable.photoURL,
    );
    return NextResponse.json({
      success: true,
      data: {
        profile: {
          ...editable,
          photoPreviewUrl,
        },
      },
    });
  } catch (error) {
    const validation = error instanceof CounsellorProfileValidationError;
    const message =
      error instanceof Error ? error.message : "Could not update your profile";
    if (!validation) console.error("Counsellor profile update failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: validation ? message : "Could not update your professional profile",
      },
      { status: validation ? 400 : 503 },
    );
  }
}

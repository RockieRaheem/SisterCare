import { NextRequest, NextResponse } from "next/server";
import {
  buildOnboardingProfileUpdate,
  OnboardingRequest,
  periodReminderPayload,
} from "@/lib/onboarding";
import {
  authenticateRequest,
  getAuthorizationFailure,
  isAuthEnforced,
} from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  if (!isAuthEnforced()) {
    return NextResponse.json(
      { success: false, error: "Profile setup is unavailable on this deployment." },
      { status: 503 },
    );
  }

  const auth = await authenticateRequest(request);
  const authorizationFailure = getAuthorizationFailure(auth);
  if (authorizationFailure) {
    return NextResponse.json(
      { success: false, error: authorizationFailure.error },
      { status: authorizationFailure.status },
    );
  }
  if (auth.status !== "verified") {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  const input = (await request.json().catch(() => null)) as OnboardingRequest | null;
  if (!input || (input.mode !== "skip" && input.mode !== "complete")) {
    return NextResponse.json(
      { success: false, error: "Invalid profile setup request." },
      { status: 400 },
    );
  }

  let profileUpdate: Record<string, unknown>;
  try {
    profileUpdate = buildOnboardingProfileUpdate(input);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Invalid profile details.",
      },
      { status: 400 },
    );
  }

  const db = getSupabaseAdmin();
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role,registration_intent,preferences")
    .eq("id", auth.uid)
    .maybeSingle();
  if (profileError) {
    return NextResponse.json(
      { success: false, error: "We could not load your profile. Please retry." },
      { status: 503 },
    );
  }
  if (!profile) {
    return NextResponse.json(
      { success: false, error: "Your account profile is not ready yet. Please retry." },
      { status: 409 },
    );
  }
  if (
    profile.role === "admin" ||
    profile.role === "counsellor" ||
    profile.registration_intent === "counsellor"
  ) {
    return NextResponse.json(
      { success: false, error: "Member profile setup is not available for this account." },
      { status: 403 },
    );
  }
  if (input.mode === "complete") {
    profileUpdate.preferences = {
      ...((profile.preferences as Record<string, unknown> | null) || {}),
      reminderDaysBefore: input.reminderDays,
    };
  }

  const { error: updateError } = await db
    .from("profiles")
    .update(profileUpdate)
    .eq("id", auth.uid);
  if (updateError) {
    console.error("Onboarding profile update failed:", updateError);
    return NextResponse.json(
      { success: false, error: "We could not save your profile. Please retry." },
      { status: 503 },
    );
  }

  let reminderScheduled = false;
  if (input.mode === "complete") {
    const cycle = profileUpdate.cycle_data as { nextPeriodDate: string };
    const payload = periodReminderPayload(
      auth.uid,
      new Date(cycle.nextPeriodDate),
      input.reminderDays,
    );
    if (payload) {
      const { data: existing } = await db
        .from("user_records")
        .select("id")
        .eq("user_id", auth.uid)
        .eq("record_type", "reminder")
        .contains("payload", { type: "period_coming", source: "onboarding" })
        .limit(1)
        .maybeSingle();
      const reminderResult = existing
        ? await db.from("user_records").update({ payload }).eq("id", existing.id)
        : await db.from("user_records").insert({
            user_id: auth.uid,
            record_type: "reminder",
            payload,
          });
      if (reminderResult.error) {
        console.error("Onboarding reminder scheduling failed:", reminderResult.error);
      } else {
        reminderScheduled = true;
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: { onboardingCompleted: true, reminderScheduled },
  });
}

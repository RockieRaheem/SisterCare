import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { CONTROLLED_PILOT } from "@/lib/pilot";
import { withApiObservability } from "@/lib/observability";

type OAuthProfileRequest = {
  mode?: unknown;
  registrationIntent?: unknown;
  pilotConsent?: {
    adultConfirmed?: unknown;
    consentVersion?: unknown;
  };
};

const NEW_ACCOUNT_WINDOW_MS = 15 * 60 * 1000;

async function finalizeOAuthProfile(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") {
    if (auth.status === "unavailable") {
      console.warn("Google OAuth profile verification temporarily unavailable:", auth.reason);
      return NextResponse.json(
        { success: false, error: "Your Google account is signed in, but SisterCare could not verify it right now. Please retry." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Your Google session could not be verified. Please sign in again." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as OAuthProfileRequest | null;
  const signup = body?.mode === "signup";
  const login = body?.mode === "login";
  if (!signup && !login) {
    return NextResponse.json(
      { success: false, error: "The Google sign-in request has expired. Please start again." },
      { status: 400 },
    );
  }
  if (
    signup &&
    !(
      (body?.registrationIntent === "member" || body?.registrationIntent === "counsellor") &&
      body.pilotConsent?.adultConfirmed === true &&
      body.pilotConsent.consentVersion === CONTROLLED_PILOT.consentVersion
    )
  ) {
    return NextResponse.json(
      { success: false, error: "Current pilot consent is required to create an account." },
      { status: 400 },
    );
  }

  const db = getSupabaseAdmin();
  const [profileResult, applicationResult, identityResult] = await Promise.all([
    db
      .from("profiles")
      .select("role,registration_intent,display_name,photo_url,created_at")
      .eq("id", auth.uid)
      .maybeSingle(),
    db
      .from("counsellor_applications")
      .select("counsellor_id")
      .eq("counsellor_id", auth.uid)
      .maybeSingle(),
    db.auth.admin.getUserById(auth.uid),
  ]);
  if (profileResult.error || applicationResult.error || identityResult.error) {
    return NextResponse.json(
      { success: false, error: "SisterCare could not prepare your Google account. Please retry." },
      { status: 503 },
    );
  }

  const identity = identityResult.data.user;
  const profile = profileResult.data;
  const existingRole = profile?.role || "member";
  const existingIntent =
    profile?.registration_intent === "counsellor" || applicationResult.data
      ? "counsellor"
      : "member";
  const createdAt = Date.parse(identity.created_at);
  const accountAge = Date.now() - createdAt;
  const newAccount =
    Number.isFinite(createdAt) &&
    accountAge >= 0 &&
    accountAge <= NEW_ACCOUNT_WINDOW_MS;
  const requestedIntent =
    signup && newAccount && existingRole === "member" && !applicationResult.data
      ? (body.registrationIntent as "member" | "counsellor")
      : existingIntent;
  const googleName =
    typeof identity.user_metadata.full_name === "string"
      ? identity.user_metadata.full_name.slice(0, 100)
      : null;
  const googlePhoto =
    typeof identity.user_metadata.avatar_url === "string"
      ? identity.user_metadata.avatar_url.slice(0, 1000)
      : null;
  const acceptedAt = signup ? new Date().toISOString() : null;

  const profileValues = {
    email: identity.email || auth.token.email || "",
    display_name: profile?.display_name || googleName,
    photo_url: profile?.photo_url || googlePhoto,
    registration_intent: requestedIntent,
    ...(signup
      ? {
          adult_confirmed: true,
          pilot_consent_version: CONTROLLED_PILOT.consentVersion,
          pilot_consent_at: acceptedAt,
        }
      : {}),
  };
  const profileWrite = profile
    ? await db.from("profiles").update(profileValues).eq("id", auth.uid)
    : await db.from("profiles").insert({
        id: auth.uid,
        role: "member",
        ...profileValues,
      });
  if (profileWrite.error) {
    return NextResponse.json(
      { success: false, error: "SisterCare could not finish setting up your Google account." },
      { status: 503 },
    );
  }

  const metadataUpdate = await db.auth.admin.updateUserById(auth.uid, {
    user_metadata: {
      ...identity.user_metadata,
      registration_intent: requestedIntent,
      ...(signup
        ? {
            adult_confirmed: true,
            pilot_consent_version: CONTROLLED_PILOT.consentVersion,
          }
        : {}),
    },
  });
  if (metadataUpdate.error) {
    console.warn("Google account metadata could not be synchronized:", metadataUpdate.error);
  }

  if (signup) {
    const { error: auditError } = await db.from("audit_events").insert({
      actor_id: auth.uid,
      event_type: "auth.google_signup_completed",
      subject_id: auth.uid,
      metadata: {
        registration_intent: requestedIntent,
        consent_version: CONTROLLED_PILOT.consentVersion,
      },
    });
    if (auditError) {
      console.warn("Google signup audit event could not be written:", auditError);
    }
  }

  return NextResponse.json({
    success: true,
    data: { registrationIntent: requestedIntent },
  });
}

export const POST = withApiObservability(
  "auth_oauth_profile_post",
  finalizeOAuthProfile,
);

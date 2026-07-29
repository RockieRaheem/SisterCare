import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  resolveRegistrationIntent,
  resolveWorkspaceRoute,
} from "@/lib/workspaceRouting";
import { withApiObservability } from "@/lib/observability";

type RequestedIntent = "member" | "counsellor";

async function resolveWorkspace(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }
  const body = (await request.json().catch(() => ({}))) as {
    requestedIntent?: string;
  };
  const requestedIntent: RequestedIntent | undefined = [
    "member",
    "counsellor",
  ].includes(body.requestedIntent || "")
    ? (body.requestedIntent as RequestedIntent)
    : undefined;
  const client = getSupabaseAdmin();
  const [profileResult, applicationResult, identityResult] = await Promise.all([
    client
      .from("profiles")
      .select("role,registration_intent,onboarding_completed")
      .eq("id", auth.uid)
      .maybeSingle(),
    client
      .from("counsellor_applications")
      .select("status")
      .eq("counsellor_id", auth.uid)
      .maybeSingle(),
    client.auth.admin.getUserById(auth.uid),
  ]);
  if (profileResult.error || applicationResult.error || identityResult.error) {
    return NextResponse.json(
      { success: false, error: "Unable to read the account workspace" },
      { status: 503 },
    );
  }

  const identity = identityResult.data.user;
  const metadataIntent =
    identity.user_metadata.registration_intent === "counsellor"
      ? "counsellor"
      : "member";
  const existingRole = profileResult.data?.role || "member";
  const existingIntent =
    profileResult.data?.registration_intent === "counsellor"
      ? "counsellor"
      : "member";
  const registrationIntent = resolveRegistrationIntent({
    role: existingRole,
    storedIntent: existingIntent,
    metadataIntent,
    hasCounsellorApplication: Boolean(applicationResult.data),
    requestedIntent,
  });

  if (!profileResult.data) {
    const { error } = await client.from("profiles").insert({
      id: auth.uid,
      email: identity.email || auth.token.email || "",
      display_name:
        typeof identity.user_metadata.full_name === "string"
          ? identity.user_metadata.full_name
          : null,
      photo_url:
        typeof identity.user_metadata.avatar_url === "string"
          ? identity.user_metadata.avatar_url
          : null,
      role: "member",
      registration_intent: registrationIntent,
    });
    if (error) {
      return NextResponse.json(
        { success: false, error: "Unable to initialize the account workspace" },
        { status: 503 },
      );
    }
  } else if (
    existingRole === "member" &&
    registrationIntent !== existingIntent
  ) {
    const { error } = await client
      .from("profiles")
      .update({ registration_intent: registrationIntent })
      .eq("id", auth.uid)
      .eq("role", "member");
    if (error) {
      return NextResponse.json(
        { success: false, error: "Unable to preserve the account type" },
        { status: 503 },
      );
    }
  }

  if (
    existingRole === "member" &&
    registrationIntent === "counsellor" &&
    metadataIntent !== "counsellor"
  ) {
    await client.auth.admin.updateUserById(auth.uid, {
      user_metadata: {
        ...identity.user_metadata,
        registration_intent: "counsellor",
      },
    });
  }

  const destination = resolveWorkspaceRoute({
    role: existingRole,
    registrationIntent,
    onboardingCompleted: profileResult.data?.onboarding_completed === true,
    applicationStatus:
      (applicationResult.data?.status as
        | "pending"
        | "verified"
        | "rejected"
        | undefined) || null,
  });
  return NextResponse.json({
    success: true,
    data: {
      destination,
      role: existingRole,
      registrationIntent,
      applicationStatus: applicationResult.data?.status || null,
    },
  });
}

export const POST = withApiObservability(
  "auth_workspace_post",
  resolveWorkspace,
);

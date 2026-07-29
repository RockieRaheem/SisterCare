export type WorkspaceRole = "member" | "counsellor" | "admin";
export type CounsellorApplicationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | null;

export function resolveRegistrationIntent(input: {
  role?: string | null;
  storedIntent?: string | null;
  metadataIntent?: string | null;
  hasCounsellorApplication?: boolean;
  requestedIntent?: "member" | "counsellor";
}): "member" | "counsellor" {
  if (input.role === "counsellor") return "counsellor";
  if (input.role === "admin") {
    return input.storedIntent === "counsellor" ? "counsellor" : "member";
  }
  return input.storedIntent === "counsellor" ||
    input.metadataIntent === "counsellor" ||
    input.hasCounsellorApplication ||
    input.requestedIntent === "counsellor"
    ? "counsellor"
    : "member";
}

/** One authoritative post-login destination for every account state. */
export function resolveWorkspaceRoute(input: {
  role?: string | null;
  registrationIntent?: "member" | "counsellor";
  onboardingCompleted?: boolean;
  applicationStatus?: CounsellorApplicationStatus;
}): string {
  if (input.role === "admin") return "/admin";
  if (input.role === "counsellor") return "/counsellor";
  if (input.registrationIntent === "counsellor") {
    return input.applicationStatus ? "/counsellor" : "/counsellor/apply";
  }
  return input.onboardingCompleted ? "/dashboard" : "/onboarding";
}

export type WorkspaceRole = "member" | "counsellor" | "admin";

/** One authoritative post-login destination for every account state. */
export function resolveWorkspaceRoute(input: {
  role?: string | null;
  registrationIntent?: "member" | "counsellor";
  onboardingCompleted?: boolean;
}): string {
  if (input.role === "admin") return "/admin";
  if (input.role === "counsellor") return "/counsellor";
  if (input.registrationIntent === "counsellor") return "/counsellor/apply";
  return input.onboardingCompleted ? "/dashboard" : "/onboarding";
}

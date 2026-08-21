export type WorkspaceRole = "member" | "counsellor" | "admin";
export type CounsellorApplicationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | null;

export function isOAuthWorkspaceReturn(search: string): boolean {
  return new URLSearchParams(search).get("oauth") === "1";
}

const MEMBER_WORKSPACE_PATHS = [
  "/dashboard",
  "/chat",
  "/library",
  "/profile",
  "/settings",
  "/analytics",
  "/counsellors",
  "/help",
] as const;

const matchesPath = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

/** Keep authenticated product roles inside their own navigation system. */
export function resolveRoleBoundaryRedirect(input: {
  pathname: string;
  role?: string | null;
  registrationIntent?: "member" | "counsellor";
  onboardingCompleted?: boolean;
}): string | null {
  const professionalPath = matchesPath(input.pathname, "/counsellor");
  const memberPath = MEMBER_WORKSPACE_PATHS.some((path) =>
    matchesPath(input.pathname, path),
  );

  if (input.role === "admin" && (professionalPath || memberPath)) {
    return "/admin";
  }
  const professionalAccount =
    input.role === "counsellor" ||
    input.registrationIntent === "counsellor";
  if (professionalAccount && memberPath) {
    if (matchesPath(input.pathname, "/help")) return "/counsellor/support";
    if (matchesPath(input.pathname, "/library")) {
      return "/counsellor/articles";
    }
    return "/counsellor";
  }
  if (
    !professionalAccount &&
    (matchesPath(input.pathname, "/counsellor/support") ||
      matchesPath(input.pathname, "/counsellor/articles"))
  ) {
    return input.onboardingCompleted ? "/dashboard" : "/onboarding";
  }
  return null;
}

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
  if (input.hasCounsellorApplication) return "counsellor";
  // Login choice is not registration. A counsellor login must never convert
  // an existing member account. An explicit Member choice may safely repair
  // an old, accidentally changed intent only while no KYC application exists.
  if (input.requestedIntent === "member") return "member";
  return input.storedIntent === "counsellor" ||
    input.metadataIntent === "counsellor"
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

/** Resolve a safe signed-in destination when leaving a public information page. */
export function resolveWorkspaceHome(input: {
  role?: string | null;
  registrationIntent?: "member" | "counsellor";
  onboardingCompleted?: boolean;
}): string {
  if (input.role === "admin") return "/admin";
  if (
    input.role === "counsellor" ||
    input.registrationIntent === "counsellor"
  ) {
    return "/counsellor";
  }
  return input.onboardingCompleted ? "/dashboard" : "/onboarding";
}

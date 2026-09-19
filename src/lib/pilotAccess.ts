const PAUSED_WORKSPACE_PREFIXES = [
  "/dashboard",
  "/chat",
  "/counsellors",
  "/doctors",
  "/wellbeing",
  "/analytics",
  "/library",
  "/profile",
  "/settings",
  "/onboarding",
  "/counsellor",
];

const PAUSED_API_PREFIXES = [
  "/api/chat",
  "/api/conversations",
  "/api/sessions",
  "/api/wellbeing",
  "/api/counsellors",
  "/api/presence",
  "/api/doctors",
  "/api/language",
  "/api/reports",
];

const RECOVERY_API_PATHS = new Set([
  "/api/sessions/sweep",
  "/api/counsellors/sync-availability",
]);

export function isPilotPaused(env: Record<string, string | undefined> = process.env): boolean {
  return env.PILOT_PAUSED?.trim().toLowerCase() === "true";
}

export function shouldPauseWorkspacePath(pathname: string): boolean {
  if (pathname === "/counsellor") return false;
  // An already accepted medical consultation must remain reachable for
  // continuity and cancellation; only new directory/request entry is paused.
  if (pathname.startsWith("/doctors/appointments/")) return false;
  return PAUSED_WORKSPACE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function shouldPauseApiPath(pathname: string, method = "GET"): boolean {
  const action = method.toUpperCase();
  if (RECOVERY_API_PATHS.has(pathname) || pathname.startsWith("/api/admin/")) return false;
  if (pathname === "/api/doctor-appointments") return action === "POST";
  // Existing prescriptions must remain readable and withdrawable even while
  // the service stops issuing new ones.
  if (pathname === "/api/doctor/prescriptions") return action === "POST";
  if (pathname === "/api/sessions") return action !== "GET";
  if (pathname.startsWith("/api/sessions/")) return false;
  if (pathname === "/api/care-followups") return action !== "GET";
  return PAUSED_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const PAUSED_WORKSPACE_PREFIXES = [
  "/dashboard",
  "/chat",
  "/counsellors",
  "/sessions",
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
  return PAUSED_WORKSPACE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function shouldPauseApiPath(pathname: string): boolean {
  if (RECOVERY_API_PATHS.has(pathname) || pathname.startsWith("/api/admin/")) return false;
  return PAUSED_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

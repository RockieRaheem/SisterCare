const RETURNABLE_PATHS = [
  "/dashboard", "/chat", "/counsellors", "/doctors", "/analytics",
  "/library", "/profile", "/settings", "/sessions", "/wellbeing",
  "/report", "/track",
] as const;

/** Keep the Help Centre's return link inside a known member destination. */
export function resolveHelpReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 200 ||
      !value.startsWith("/") || value.startsWith("//") ||
      /[\\?#%\x00-\x1f]/.test(value) || /(^|\/)\.{1,2}(\/|$)/.test(value)) return null;
  return RETURNABLE_PATHS.some((base) =>
    value === base || value.startsWith(`${base}/`),
  ) ? value : null;
}

export function helpHref(pathname: string): string {
  const returnPath = resolveHelpReturnPath(pathname);
  return returnPath ? `/help?from=${encodeURIComponent(returnPath)}` : "/help";
}

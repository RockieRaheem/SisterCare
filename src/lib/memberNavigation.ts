export const MEMBER_PRIMARY_NAVIGATION = [
  {
    href: "/dashboard",
    icon: "home",
    labelKey: "home",
  },
  {
    href: "/chat",
    icon: "chat_bubble",
    labelKey: "chat",
  },
  {
    href: "/counsellors",
    icon: "support_agent",
    labelKey: "counsellors",
  },
  {
    href: "/analytics",
    icon: "monitoring",
    labelKey: "analytics",
  },
  {
    href: "/profile",
    icon: "person",
    labelKey: "profile",
  },
] as const;

export type MemberPrimaryNavigationItem =
  (typeof MEMBER_PRIMARY_NAVIGATION)[number];

const MEMBER_NAVIGATION_HIDDEN_PATHS = new Set([
  "/",
  "/about",
  "/help",
  "/onboarding",
  "/privacy",
  "/terms",
]);

export function isMemberNavigationHiddenPath(pathname: string): boolean {
  return (
    MEMBER_NAVIGATION_HIDDEN_PATHS.has(pathname) ||
    pathname.startsWith("/auth/") ||
    pathname === "/counsellor" ||
    pathname.startsWith("/counsellor/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

export function isMemberPrimaryDestination(pathname: string): boolean {
  return MEMBER_PRIMARY_NAVIGATION.some(
    ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
  );
}

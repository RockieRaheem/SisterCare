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

export function isMemberPrimaryDestination(pathname: string): boolean {
  return MEMBER_PRIMARY_NAVIGATION.some(
    ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
  );
}

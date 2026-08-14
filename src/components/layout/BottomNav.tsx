"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { MEMBER_PRIMARY_NAVIGATION } from "@/lib/memberNavigation";

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { userProfile } = useAuth();

  // Don't show on landing, login, signup, or onboarding pages
  const hiddenPaths = [
    "/",
    "/about",
    "/auth/login",
    "/auth/signup",
    "/help",
    "/onboarding",
    "/privacy",
    "/terms",
  ];
  if (
    hiddenPaths.includes(pathname) ||
    pathname.startsWith("/admin") ||
    pathname === "/counsellor" ||
    pathname.startsWith("/counsellor/") ||
    userProfile?.role === "admin" ||
    userProfile?.role === "counsellor" ||
    userProfile?.registrationIntent === "counsellor"
  ) {
    return null;
  }

  return (
    <nav
      className="member-bottom-nav border-t border-border-light/80 bg-white/95 dark:border-border-dark dark:bg-card-dark/95"
      aria-label={t.nav.home}
      role="navigation"
    >
      <div className="mx-auto max-w-md">
        <div
          className="flex h-[64px] items-center justify-around px-1"
          role="menubar"
        >
          {MEMBER_PRIMARY_NAVIGATION.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            const label = t.nav[item.labelKey];

            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                aria-current={isActive ? "page" : undefined}
                aria-label={`${label}${isActive ? " (current page)" : ""}`}
                className={`
                  relative flex flex-col items-center justify-center
                  flex-1 h-[60px] py-1.5 px-1
                  transition-all duration-200 ease-out
                  touch-target focus-ring rounded-xl
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                  ${
                    isActive
                      ? "text-primary"
                      : "text-text-secondary dark:text-gray-400 active:text-primary"
                  }
                `}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" aria-hidden="true" />
                )}

                <span
                  className={`
                    material-symbols-outlined text-[26px] mb-0.5
                    transition-transform duration-200
                    ${isActive ? "scale-110" : ""}
                  `}
                  style={{
                    fontVariationSettings: isActive
                      ? '"FILL" 1, "wght" 600'
                      : '"FILL" 0, "wght" 400',
                  }}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span
                  className={`text-[10px] leading-tight ${isActive ? "font-bold" : "font-medium"}`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

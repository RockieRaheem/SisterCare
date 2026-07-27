"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  // Navigation items with translation keys
  const navItems = [
    { href: "/dashboard", icon: "home", labelKey: "home" as const },
    { href: "/chat", icon: "chat_bubble", labelKey: "chat" as const },
    { href: "/counsellors", icon: "support_agent", labelKey: "help" as const },
    { href: "/library", icon: "menu_book", labelKey: "library" as const },
    { href: "/profile", icon: "person", labelKey: "profile" as const },
  ];

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
    pathname === "/counsellor"
  ) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden px-2 pb-2"
      aria-label={t.nav.home}
      role="navigation"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto max-w-md overflow-hidden rounded-[22px] border border-border-light/80 bg-white/92 shadow-[0_-8px_30px_rgba(35,27,45,0.12)] backdrop-blur-xl dark:border-border-dark dark:bg-card-dark/92">
        <div
          className="flex h-[64px] items-center justify-around px-2"
          role="menubar"
        >
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            // Get translated label
            const label =
              item.labelKey === "home"
                ? t.nav.home
                : item.labelKey === "chat"
                  ? t.nav.chat
                  : item.labelKey === "help"
                    ? t.nav.help
                    : item.labelKey === "library"
                      ? t.nav.library
                      : t.nav.profile;

            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                aria-current={isActive ? "page" : undefined}
                aria-label={`${label}${isActive ? " (current page)" : ""}`}
                className={`
                  relative flex flex-col items-center justify-center 
                  flex-1 h-[56px] py-1.5 px-1
                  transition-all duration-200 ease-out
                  touch-target focus-ring rounded-xl
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                  ${
                    isActive
                      ? "text-primary bg-primary/[0.07]"
                      : "text-text-secondary dark:text-gray-400 active:text-primary"
                  }
                `}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute top-0 h-0.5 w-7 rounded-full bg-primary" aria-hidden="true" />
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

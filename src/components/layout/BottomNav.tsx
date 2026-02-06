"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", icon: "home", label: "Home" },
  { href: "/chat", icon: "chat_bubble", label: "Chat" },
  { href: "/counsellors", icon: "support_agent", label: "Help" },
  { href: "/library", icon: "menu_book", label: "Learn" },
  { href: "/profile", icon: "person", label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Don't show on landing, login, signup, or onboarding pages
  const hiddenPaths = ["/", "/auth/login", "/auth/signup", "/onboarding"];
  if (hiddenPaths.includes(pathname)) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom">
      <div className="bg-white dark:bg-card-dark border-t border-border-light dark:border-border-dark shadow-soft-lg">
        <div className="flex items-center justify-around px-2 h-[72px] max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative flex flex-col items-center justify-center 
                  flex-1 h-full py-2 px-1
                  transition-all duration-200 ease-out
                  touch-target focus-ring rounded-xl
                  ${
                    isActive
                      ? "text-primary"
                      : "text-text-secondary dark:text-gray-400 active:text-primary"
                  }
                `}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute top-1 w-8 h-1 bg-primary rounded-full" />
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
                >
                  {item.icon}
                </span>
                <span
                  className={`text-[10px] leading-tight ${isActive ? "font-bold" : "font-medium"}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

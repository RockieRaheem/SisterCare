"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", icon: "dashboard", label: "Home" },
  { href: "/chat", icon: "chat_bubble", label: "Chat" },
  { href: "/library", icon: "menu_book", label: "Library" },
  { href: "/settings", icon: "settings", label: "Settings" },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Don't show on landing, login, or signup pages
  const hiddenPaths = ["/", "/auth/login", "/auth/signup"];
  if (hiddenPaths.includes(pathname)) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-card-dark border-t border-border-light dark:border-border-dark md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-text-secondary dark:text-gray-400 hover:text-primary"
              }`}
            >
              <span
                className={`material-symbols-outlined text-2xl ${
                  isActive ? "font-semibold" : ""
                }`}
                style={{
                  fontVariationSettings: isActive
                    ? '"FILL" 1, "wght" 500'
                    : '"FILL" 0, "wght" 400',
                }}
              >
                {item.icon}
              </span>
              <span className={`text-xs mt-1 ${isActive ? "font-medium" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for phones with home indicators */}
      <div className="h-safe-area-inset-bottom bg-white dark:bg-card-dark" />
    </nav>
  );
}

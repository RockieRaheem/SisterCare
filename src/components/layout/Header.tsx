"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import NotificationBell from "@/components/ui/NotificationBell";

interface HeaderProps {
  variant?: "landing" | "app";
}

interface NavLink {
  href: string;
  label: string;
}

const navLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/chat", label: "Support Chat" },
  { href: "/library", label: "Library" },
  { href: "/settings", label: "Settings" },
];

export default function Header({ variant = "landing" }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/library?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Check if a link is active
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname.startsWith(href);
  };

  if (variant === "app") {
    return (
      <header className="flex items-center justify-between whitespace-nowrap border-b border-border-light dark:border-border-dark px-6 lg:px-10 py-3 bg-white dark:bg-card-dark sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 text-primary"
          >
            <span className="material-symbols-outlined text-2xl">favorite</span>
            <h2 className="text-text-primary dark:text-white text-lg font-bold leading-tight tracking-tight">
              SisterCare
            </h2>
          </Link>
          <nav className="hidden md:flex items-center gap-9">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm leading-normal transition-colors ${
                  isActive(link.href)
                    ? "text-primary font-semibold"
                    : "text-text-primary dark:text-white font-medium hover:text-primary"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-1 justify-end gap-4 items-center">
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-col min-w-40 h-10 max-w-64"
          >
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full overflow-hidden">
              <button
                type="submit"
                className="text-text-secondary flex border-none bg-border-light dark:bg-border-dark items-center justify-center pl-4 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-xl">
                  search
                </span>
              </button>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input flex w-full min-w-0 flex-1 border-none bg-border-light dark:bg-border-dark text-text-primary dark:text-white focus:ring-0 h-full placeholder:text-text-secondary px-4 pl-2 text-sm"
                placeholder="Search resources..."
              />
            </div>
          </form>
          <div className="flex gap-2 items-center">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center rounded-lg size-10 bg-border-light dark:bg-border-dark text-text-primary dark:text-white hover:bg-primary hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">
                {theme === "light" ? "dark_mode" : "light_mode"}
              </span>
            </button>
            <NotificationBell />
          </div>
          <div className="flex items-center gap-3">
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary/20"
              style={{
                backgroundImage: `url('${user?.photoURL || "https://ui-avatars.com/api/?name=User&background=8c30e8&color=fff"}')`,
              }}
            />
            {user && (
              <button
                onClick={signOut}
                className="text-sm text-text-secondary hover:text-primary transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </header>
    );
  }

  // Landing page header
  return (
    <header className="flex items-center justify-between border-b border-border-light dark:border-border-dark px-6 lg:px-40 py-4 sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md z-50">
      <div className="flex items-center gap-3">
        <div className="text-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl">favorite</span>
        </div>
        <h2 className="text-lg font-bold leading-tight tracking-tight">
          SisterCare
        </h2>
      </div>
      <div className="flex flex-1 justify-end gap-8 items-center">
        <nav className="hidden md:flex items-center gap-8">
          <a
            className="text-sm font-medium hover:text-primary transition-colors"
            href="#mission"
          >
            Our Mission
          </a>
          <a
            className="text-sm font-medium hover:text-primary transition-colors"
            href="#features"
          >
            Features
          </a>
          <a
            className="text-sm font-medium hover:text-primary transition-colors"
            href="#privacy"
          >
            Privacy
          </a>
        </nav>
        <div className="flex gap-3">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center rounded-lg size-10 bg-border-light dark:bg-border-dark text-text-primary dark:text-white hover:bg-primary hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">
              {theme === "light" ? "dark_mode" : "light_mode"}
            </span>
          </button>
          <Link
            href="/auth/signup"
            className="flex min-w-[84px] items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold transition-opacity hover:opacity-90"
          >
            Sign Up
          </Link>
          <Link
            href="/auth/login"
            className="flex min-w-[84px] items-center justify-center rounded-lg h-10 px-4 bg-border-light dark:bg-border-dark text-text-primary dark:text-white text-sm font-bold transition-colors hover:bg-opacity-80"
          >
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}

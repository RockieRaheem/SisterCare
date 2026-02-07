"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import NotificationBell from "@/components/ui/NotificationBell";

// Helper function to get initials from name or email
function getInitials(displayName: string | null, email: string | null): string {
  if (displayName) {
    const names = displayName.trim().split(" ");
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  }
  if (email) {
    const localPart = email.split("@")[0];
    return localPart.substring(0, 2).toUpperCase();
  }
  return "U";
}

interface HeaderProps {
  variant?: "landing" | "app";
}

interface NavLink {
  href: string;
  label: string;
  icon: string;
}

const navLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/chat", label: "Chat", icon: "chat_bubble" },
  { href: "/counsellors", label: "Counsellors", icon: "support_agent" },
  { href: "/library", label: "Library", icon: "menu_book" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export default function Header({ variant = "landing" }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/library?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  // Check if a link is active
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  // Get current page title
  const getCurrentPageTitle = () => {
    const currentLink = navLinks.find((link) => isActive(link.href));
    return currentLink?.label || "SisterCare";
  };

  if (variant === "app") {
    return (
      <>
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 safe-top">
          <div className="flex items-center justify-between h-14 px-4 bg-white/95 dark:bg-card-dark/95 backdrop-blur-lg border-b border-border-light dark:border-border-dark">
            {/* Logo */}
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-primary"
            >
              <span
                className="material-symbols-outlined text-2xl"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                favorite
              </span>
              <span className="font-bold text-text-primary dark:text-white">
                {getCurrentPageTitle()}
              </span>
            </Link>

            {/* Right Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-xl text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors touch-target"
              >
                <span className="material-symbols-outlined text-[22px]">
                  search
                </span>
              </button>

              <NotificationBell />

              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-10 h-10 rounded-xl text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors touch-target"
              >
                <span className="material-symbols-outlined text-[22px]">
                  {theme === "light" ? "dark_mode" : "light_mode"}
                </span>
              </button>
            </div>
          </div>

          {/* Mobile Search Bar - Expandable */}
          {searchOpen && (
            <div className="absolute top-full left-0 right-0 bg-white dark:bg-card-dark border-b border-border-light dark:border-border-dark p-3 animate-fade-in">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-11 pr-4 rounded-xl bg-background-light dark:bg-background-dark border-0 text-text-primary dark:text-white placeholder:text-text-secondary text-sm focus:ring-2 focus:ring-primary/50"
                  placeholder="Search resources..."
                  autoFocus
                />
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-xl">
                  search
                </span>
              </form>
            </div>
          )}
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between whitespace-nowrap border-b border-border-light dark:border-border-dark px-6 lg:px-10 py-3 bg-white dark:bg-card-dark sticky top-0 z-40">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 text-primary"
            >
              <span
                className="material-symbols-outlined text-2xl"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                favorite
              </span>
              <h2 className="text-text-primary dark:text-white text-lg font-bold leading-tight tracking-tight">
                SisterCare
              </h2>
            </Link>
            <nav className="flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                    ${
                      isActive(link.href)
                        ? "bg-primary/10 text-primary"
                        : "text-text-primary dark:text-white hover:bg-primary/5 hover:text-primary"
                    }
                  `}
                >
                  <span
                    className="material-symbols-outlined text-lg"
                    style={{
                      fontVariationSettings: isActive(link.href)
                        ? '"FILL" 1'
                        : '"FILL" 0',
                    }}
                  >
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-1 justify-end gap-4 items-center">
            <form
              onSubmit={handleSearch}
              className="flex flex-col min-w-40 h-10 max-w-64"
            >
              <div className="flex w-full flex-1 items-stretch rounded-xl h-full overflow-hidden bg-background-light dark:bg-background-dark">
                <button
                  type="submit"
                  className="text-text-secondary flex items-center justify-center pl-4 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">
                    search
                  </span>
                </button>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex w-full min-w-0 flex-1 border-none bg-transparent text-text-primary dark:text-white focus:ring-0 h-full placeholder:text-text-secondary px-3 text-sm"
                  placeholder="Search..."
                />
              </div>
            </form>

            <div className="flex gap-2 items-center">
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center rounded-xl w-10 h-10 bg-background-light dark:bg-background-dark text-text-primary dark:text-white hover:bg-primary hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">
                  {theme === "light" ? "dark_mode" : "light_mode"}
                </span>
              </button>
              <NotificationBell />
            </div>

            <div className="flex items-center gap-3 pl-2 border-l border-border-light dark:border-border-dark">
              <Link
                href="/profile"
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                {user?.photoURL ? (
                  <div
                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-9 h-9 border-2 border-primary/20"
                    style={{
                      backgroundImage: `url('${user.photoURL}')`,
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center rounded-full w-9 h-9 border-2 border-primary/20 bg-gradient-to-br from-primary to-purple-600 text-white text-sm font-bold">
                    {getInitials(
                      user?.displayName || null,
                      user?.email || null,
                    )}
                  </div>
                )}
              </Link>
              {user && (
                <button
                  onClick={signOut}
                  className="text-sm text-text-secondary hover:text-primary transition-colors font-medium"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </header>
      </>
    );
  }

  // Landing page header
  return (
    <>
      <header className="flex items-center justify-between px-4 sm:px-6 lg:px-20 py-3 sm:py-4 sticky top-0 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-lg z-50 border-b border-border-light/50 dark:border-border-dark/50 safe-top">
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <div className="text-primary flex items-center justify-center">
            <span
              className="material-symbols-outlined text-2xl sm:text-3xl"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              favorite
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold leading-tight tracking-tight text-text-primary dark:text-white">
            SisterCare
          </h2>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Desktop navigation */}
          <nav className="hidden lg:flex items-center gap-6 mr-4">
            <a
              className="text-sm font-medium hover:text-primary transition-colors text-text-primary dark:text-white"
              href="#mission"
            >
              Our Mission
            </a>
            <a
              className="text-sm font-medium hover:text-primary transition-colors text-text-primary dark:text-white"
              href="#features"
            >
              Features
            </a>
            <a
              className="text-sm font-medium hover:text-primary transition-colors text-text-primary dark:text-white"
              href="#privacy"
            >
              Privacy
            </a>
          </nav>

          <button
            onClick={toggleTheme}
            className="flex items-center justify-center rounded-xl w-10 h-10 bg-white dark:bg-card-dark text-text-primary dark:text-white hover:bg-primary hover:text-white transition-colors shadow-soft touch-target"
          >
            <span className="material-symbols-outlined text-xl">
              {theme === "light" ? "dark_mode" : "light_mode"}
            </span>
          </button>

          <div className="hidden sm:flex gap-2">
            <Link
              href="/auth/login"
              className="flex items-center justify-center rounded-xl h-10 px-4 bg-white dark:bg-card-dark text-text-primary dark:text-white text-sm font-semibold transition-all hover:shadow-soft shadow-sm border border-border-light dark:border-border-dark"
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="flex items-center justify-center rounded-xl h-10 px-4 sm:px-5 bg-primary text-white text-sm font-semibold transition-all hover:bg-primary-dark shadow-primary-sm"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden flex items-center justify-center rounded-xl w-10 h-10 bg-white dark:bg-card-dark text-text-primary dark:text-white shadow-soft touch-target sm:hidden"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="absolute top-0 right-0 w-[280px] max-w-[85vw] h-full bg-white dark:bg-card-dark shadow-2xl animate-slide-in-right safe-top">
            <div className="flex flex-col h-full">
              {/* Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark">
                <span className="font-bold text-lg text-text-primary dark:text-white">
                  Menu
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Menu Links */}
              <nav className="flex-1 p-4 space-y-1">
                <a
                  href="#mission"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-primary dark:text-white hover:bg-primary/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-primary">
                    flag
                  </span>
                  Our Mission
                </a>
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-primary dark:text-white hover:bg-primary/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-primary">
                    star
                  </span>
                  Features
                </a>
                <a
                  href="#privacy"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-primary dark:text-white hover:bg-primary/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-primary">
                    lock
                  </span>
                  Privacy
                </a>
              </nav>

              {/* Menu Footer */}
              <div className="p-4 border-t border-border-light dark:border-border-dark space-y-3 safe-bottom">
                <Link
                  href="/auth/login"
                  className="flex items-center justify-center w-full h-12 rounded-xl bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-semibold transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="flex items-center justify-center w-full h-12 rounded-xl bg-primary text-white font-semibold transition-colors shadow-primary-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started Free
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

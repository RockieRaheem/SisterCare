"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import NotificationBell from "@/components/ui/NotificationBell";
import { auth } from "@/lib/authClient";
import { MEMBER_PRIMARY_NAVIGATION } from "@/lib/memberNavigation";

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

export default function Header({ variant = "landing" }: HeaderProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const [mobileSigningOut, setMobileSigningOut] = useState(false);
  const [mobileAccountError, setMobileAccountError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    auth.currentUser?.getIdTokenResult().then((result) => setIsAdmin(result.claims.role === "admin")).catch(() => setIsAdmin(false));
  }, [user]);

  // Get translated label for nav item
  const getNavLabel = (key: (typeof MEMBER_PRIMARY_NAVIGATION)[number]["labelKey"]) => t.nav[key];

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
    setMobileAccountOpen(false);
    setMobileAccountError("");
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

  const handleMobileSignOut = async () => {
    setMobileSigningOut(true);
    setMobileAccountError("");
    try {
      await signOut();
      setMobileAccountOpen(false);
      router.replace("/");
    } catch (error) {
      console.error("Error signing out:", error);
      setMobileAccountError(
        "SisterCare could not sign you out. Check your connection and try again.",
      );
    } finally {
      setMobileSigningOut(false);
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
    if (pathname.startsWith("/admin")) return "Admin";
    const currentLink = MEMBER_PRIMARY_NAVIGATION.find((link) => isActive(link.href));
    if (currentLink) return getNavLabel(currentLink.labelKey);
    if (pathname.startsWith("/library")) return t.nav.library;
    if (pathname.startsWith("/settings")) return t.nav.settings;
    return "SisterCare";
  };

  if (variant === "app") {
    return (
      <>
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 safe-top">
          <div className="flex h-16 items-center justify-between border-b border-border-light bg-white/95 px-4 shadow-[0_1px_0_rgba(35,27,45,0.02)] backdrop-blur dark:border-border-dark dark:bg-card-dark/95">
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
                onClick={() => {
                  setSearchOpen(!searchOpen);
                  setMobileAccountOpen(false);
                }}
                className="flex items-center justify-center w-10 h-10 rounded-xl text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors touch-target"
                aria-label={searchOpen ? "Close search" : "Search SisterCare"}
                aria-expanded={searchOpen}
              >
                <span className="material-symbols-outlined text-[22px]">
                  search
                </span>
              </button>

              <NotificationBell />

              {user && (
                <button
                  onClick={() => {
                    setMobileAccountOpen((open) => !open);
                    setSearchOpen(false);
                    setMobileAccountError("");
                  }}
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-primary/20 bg-primary text-xs font-extrabold text-white shadow-primary-sm transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label="Open account menu"
                  aria-expanded={mobileAccountOpen}
                  aria-controls="mobile-account-menu"
                >
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photoURL}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(user.displayName, user.email)
                  )}
                </button>
              )}
            </div>
          </div>

          {mobileAccountOpen && user && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default bg-transparent"
                onClick={() => setMobileAccountOpen(false)}
                aria-label="Close account menu"
              />
              <div
                id="mobile-account-menu"
                className="absolute right-3 top-[calc(100%+0.5rem)] z-50 w-[min(19rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-primary/15 bg-white p-2 shadow-2xl shadow-black/15 dark:border-primary/25 dark:bg-card-dark"
              >
                <div className="rounded-xl bg-primary/[0.05] px-3 py-3">
                  <p className="truncate text-sm font-bold text-text-primary dark:text-white">
                    {user.displayName || "Your account"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-text-secondary dark:text-gray-400">
                    {user.email}
                  </p>
                </div>
                <div className="mt-1 grid gap-0.5">
                  <Link
                    href="/profile"
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-text-primary transition-colors hover:bg-primary/[0.06] hover:text-primary dark:text-white"
                  >
                    <span className="material-symbols-outlined text-xl text-primary" aria-hidden="true">person</span>
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-text-primary transition-colors hover:bg-primary/[0.06] hover:text-primary dark:text-white"
                  >
                    <span className="material-symbols-outlined text-xl text-primary" aria-hidden="true">settings</span>
                    Settings and privacy
                  </Link>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-text-primary transition-colors hover:bg-primary/[0.06] hover:text-primary dark:text-white"
                  >
                    <span className="material-symbols-outlined text-xl text-primary" aria-hidden="true">
                      {resolvedTheme === "light" ? "dark_mode" : "light_mode"}
                    </span>
                    {resolvedTheme === "light" ? "Use dark appearance" : "Use light appearance"}
                  </button>
                </div>
                <div className="my-1 border-t border-border-light dark:border-border-dark" />
                {mobileAccountError && (
                  <p role="alert" className="mx-2 mb-1 rounded-xl bg-red-50 px-3 py-2 text-xs leading-5 text-red-700 dark:bg-red-950/30 dark:text-red-300">
                    {mobileAccountError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void handleMobileSignOut()}
                  disabled={mobileSigningOut}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <span className="material-symbols-outlined text-xl" aria-hidden="true">logout</span>
                  {mobileSigningOut ? "Signing out securely…" : "Sign out"}
                </button>
              </div>
            </>
          )}

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
        <header className="sticky top-0 z-40 hidden min-h-[72px] items-center justify-between whitespace-nowrap border-b border-border-light bg-white/95 px-6 backdrop-blur dark:border-border-dark dark:bg-card-dark/95 md:flex lg:px-10">
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
              <h2 className="text-text-primary dark:text-white text-lg font-extrabold leading-tight tracking-[-0.03em]">
                SisterCare
              </h2>
            </Link>
            <nav className="flex items-center gap-1">
              {MEMBER_PRIMARY_NAVIGATION.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors
                    ${
                      isActive(link.href)
                        ? "bg-primary/[0.09] text-primary-dark shadow-[inset_0_0_0_1px_rgba(255,0,255,0.10)]"
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
                  {getNavLabel(link.labelKey)}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${pathname.startsWith("/admin") ? "bg-primary/[0.09] text-primary" : "text-text-primary dark:text-white hover:bg-primary/5 hover:text-primary"}`}
                >
                  <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                  Admin
                </Link>
              )}
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
                  {resolvedTheme === "light" ? "dark_mode" : "light_mode"}
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
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary/20 bg-primary text-sm font-bold text-white">
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
      <header className="safe-top sticky top-0 z-50 flex min-h-[68px] items-center justify-between border-b border-border-light bg-white/95 px-4 backdrop-blur dark:border-border-dark dark:bg-background-dark/95 sm:px-6 lg:px-12 xl:px-20">
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
              {resolvedTheme === "light" ? "dark_mode" : "light_mode"}
            </span>
          </button>

          <div className="hidden sm:flex gap-2">
            <Link
              href="/auth/login"
              className="flex h-11 items-center justify-center rounded-lg border border-border-light bg-white px-5 text-sm font-semibold text-text-primary transition-colors hover:border-primary/30 hover:text-primary dark:border-border-dark dark:bg-card-dark dark:text-white"
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-primary-sm transition-colors hover:bg-primary-dark"
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

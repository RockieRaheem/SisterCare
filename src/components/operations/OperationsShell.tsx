"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export interface OperationsNavItem {
  href: string;
  label: string;
  description: string;
  icon: string;
}

interface OperationsShellProps {
  children: React.ReactNode;
  mode: "admin" | "counsellor";
  navigation: readonly OperationsNavItem[];
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function OperationsShell({
  children,
  mode,
  navigation,
}: OperationsShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const workspace =
    mode === "admin"
      ? {
          icon: "admin_panel_settings",
          name: "Admin console",
          label: "Care operations",
          restricted: "Restricted operations workspace",
          note: "Role, safety and publication decisions are recorded in the audit trail.",
        }
      : {
          icon: "support_agent",
          name: "Counsellor desk",
          label: "Professional care",
          restricted: "Confidential care workspace",
          note: "Keep member information inside SisterCare and end your shift by going offline.",
        };

  const identity =
    userProfile?.displayName?.trim() ||
    user?.displayName?.trim() ||
    user?.email?.split("@")[0] ||
    (mode === "admin" ? "Administrator" : "Counsellor");
  const email = user?.email || "";
  const avatarText = initials(identity) || "SC";
  const activeItem = useMemo(
    () =>
      navigation.find((item) =>
        item.href === `/${mode}`
          ? pathname === item.href
          : pathname.startsWith(item.href),
      ) || navigation[0],
    [mode, navigation, pathname],
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", close);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const leave = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  const navigationContent = (
    <>
      <div className="px-3">
        <Link
          href={`/${mode}`}
          className="flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-primary-sm">
            <span className="material-symbols-outlined" aria-hidden="true">
              {workspace.icon}
            </span>
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              SisterCare
            </span>
            <span className="block truncate text-base font-extrabold text-slate-950 dark:text-white">
              {workspace.name}
            </span>
          </span>
        </Link>
      </div>

      <nav className="mt-8 space-y-1.5" aria-label={`${workspace.name} navigation`}>
        {navigation.map((item) => {
          const active =
            item.href === `/${mode}`
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group flex min-h-12 items-center gap-3 rounded-2xl px-3 py-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                active
                  ? "bg-primary text-white shadow-primary-sm"
                  : "text-slate-600 hover:bg-primary/7 hover:text-primary dark:text-slate-300 dark:hover:bg-primary/10"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  active
                    ? "bg-white/16"
                    : "bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary dark:bg-slate-800"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  {item.icon}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{item.label}</span>
                <span
                  className={`mt-0.5 block truncate text-[11px] ${
                    active ? "text-white/75" : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 dark:border-primary/20 dark:bg-primary/10">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              lock
            </span>
            <p className="text-xs font-bold">{workspace.restricted}</p>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
            {workspace.note}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-extrabold text-white dark:bg-white dark:text-slate-900">
            {avatarText}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">
              {identity}
            </span>
            <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
              {email}
            </span>
          </span>
          <button
            type="button"
            onClick={leave}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-red-950/30"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              logout
            </span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-900 dark:bg-[#111016] dark:text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[292px] flex-col border-r border-slate-200/80 bg-white px-4 py-6 dark:border-slate-800 dark:bg-[#18161f] lg:flex">
        {navigationContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={`${workspace.name} menu`}
            className="relative flex h-full w-[min(88vw,340px)] flex-col border-r border-slate-200 bg-white px-4 py-5 shadow-2xl dark:border-slate-800 dark:bg-[#18161f]"
          >
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
            {navigationContent}
          </aside>
        </div>
      )}

      <div className="min-h-screen lg:pl-[292px]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-[#18161f]/90">
          <div className="mx-auto flex min-h-16 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open workspace menu"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white lg:hidden"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                menu
              </span>
            </button>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                {workspace.label}
              </p>
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                {activeItem?.label}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                Secure session
              </div>
              <button
                type="button"
                onClick={leave}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-600 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-300 dark:hover:bg-red-950/30 sm:hidden"
                aria-label="Sign out"
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">
                  logout
                </span>
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}

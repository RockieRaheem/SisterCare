"use client";

import Link from "next/link";

/**
 * Shared split-screen shell for auth pages: a warm brand panel on the left
 * (desktop) and the focused form on the right. Keeps login/signup visually
 * identical by construction.
 */
export default function AuthShell({
  activeTab,
  children,
}: {
  activeTab: "login" | "signup";
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark">
      {/* ===== Brand panel (desktop only) ===== */}
      <aside className="hidden w-[44%] bg-primary lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">

        <Link href="/" className="relative flex items-center gap-3 text-white">
          <span
            className="material-symbols-outlined text-3xl"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            favorite
          </span>
          <span className="text-xl font-bold tracking-tight">SisterCare</span>
        </Link>

        <div className="relative max-w-md">
          <span className="mb-5 inline-flex rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-white/90">
            Private, practical, human
          </span>
          <h2 className="mb-4 text-4xl font-extrabold leading-[1.08] text-white xl:text-5xl">
            Health support that listens first.
          </h2>
          <p className="mb-8 text-lg leading-relaxed text-white/80">
            Track your cycle, talk to Sister in your own language, and reach a
            real counsellor whenever you need one.
          </p>

          <div className="space-y-4">
            {[
              ["lock", "Private by design — delete everything anytime"],
              ["language", "Multilingual support, including voice"],
              ["support_agent", "Verified counsellors, one tap away"],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-3 text-white/90">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <span className="material-symbols-outlined text-lg">
                    {icon}
                  </span>
                </span>
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/60">
          Designed for women everywhere · Uganda first
        </p>
      </aside>

      {/* ===== Form panel ===== */}
      <main className="flex flex-1 flex-col bg-background-light dark:bg-background-dark">
        {/* Mobile header */}
        <div className="safe-top flex items-center justify-center py-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2 text-primary">
            <span
              className="material-symbols-outlined text-3xl"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              favorite
            </span>
            <span className="text-xl font-bold tracking-tight text-text-primary dark:text-white">
              SisterCare
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-start justify-center px-4 py-5 sm:items-center sm:px-8 sm:py-10">
          <div className="w-full max-w-[440px]">
            {/* Login / signup toggle */}
            <div className="mb-6 flex rounded-xl border border-border-light bg-white p-1 shadow-soft dark:border-border-dark dark:bg-card-dark">
              {(
                [
                  ["login", "Sign In", "/auth/login"],
                  ["signup", "Create Account", "/auth/register"],
                ] as const
              ).map(([key, label, href]) =>
                activeTab === key ? (
                  <span
                    key={key}
                    className="flex h-11 flex-1 items-center justify-center rounded-[12px] bg-primary text-sm font-semibold text-white shadow-primary-sm"
                  >
                    {label}
                  </span>
                ) : (
                  <Link
                    key={key}
                    href={href}
                    className="flex h-11 flex-1 items-center justify-center rounded-[12px] text-sm font-semibold text-text-secondary transition-colors hover:bg-primary/5 hover:text-primary"
                  >
                    {label}
                  </Link>
                ),
              )}
            </div>

            {children}

            <p className="safe-bottom mt-8 text-center text-xs text-text-secondary dark:text-gray-500">
              <span className="material-symbols-outlined mr-1 align-middle text-sm text-primary">
                verified_user
              </span>
              Private by design — your health information is never sold.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

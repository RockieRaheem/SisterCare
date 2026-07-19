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
      <aside className="relative hidden w-[45%] overflow-hidden bg-gradient-to-br from-primary via-purple-600 to-indigo-700 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-pink-400/20 blur-3xl" />

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
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-white">
            A safe space that&apos;s always yours.
          </h2>
          <p className="mb-8 text-lg leading-relaxed text-white/80">
            Track your cycle, talk to Sister in your own language, and reach a
            real counsellor whenever you need one.
          </p>

          <div className="space-y-4">
            {[
              ["lock", "Private by design — delete everything anytime"],
              ["language", "Speaks 8 Ugandan languages, voice included"],
              ["support_agent", "Verified counsellors, one tap away"],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-3 text-white/90">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                  <span className="material-symbols-outlined text-lg">
                    {icon}
                  </span>
                </span>
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/50">
          Made with 💜 for women everywhere · Uganda first
        </p>
      </aside>

      {/* ===== Form panel ===== */}
      <main className="flex flex-1 flex-col">
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

        <div className="flex flex-1 items-start justify-center px-4 py-4 sm:items-center sm:py-10">
          <div className="w-full max-w-[440px]">
            {/* Login / signup toggle */}
            <div className="mb-6 flex rounded-2xl border border-border-light bg-white p-1.5 shadow-soft dark:border-border-dark dark:bg-card-dark">
              {(
                [
                  ["login", "Sign In", "/auth/login"],
                  ["signup", "Create Account", "/auth/signup"],
                ] as const
              ).map(([key, label, href]) =>
                activeTab === key ? (
                  <span
                    key={key}
                    className="flex h-10 flex-1 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white shadow-primary-sm"
                  >
                    {label}
                  </span>
                ) : (
                  <Link
                    key={key}
                    href={href}
                    className="flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-semibold text-text-secondary transition-colors hover:text-primary"
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
              Your data is encrypted and private — never shared, never sold.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

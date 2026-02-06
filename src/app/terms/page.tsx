"use client";

import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

export default function TermsPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === "dark" ? "dark" : ""}`}>
      <div className="bg-background-light dark:bg-background-dark min-h-screen">
        {/* Header */}
        <header className="bg-white dark:bg-card-dark border-b border-border-light dark:border-border-dark safe-top">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-xl sm:text-2xl">
                favorite
              </span>
              <span className="font-bold text-base sm:text-lg">SisterCare</span>
            </Link>
            <Link
              href="/"
              className="text-xs sm:text-sm text-primary hover:underline active:opacity-70"
            >
              ← Back to Home
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12 safe-bottom">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary dark:text-white mb-1.5 sm:mb-2">
            Terms of Service
          </h1>
          <p className="text-text-secondary text-sm sm:text-base mb-6 sm:mb-8">
            Last updated: February 5, 2026
          </p>

          <div className="prose dark:prose-invert max-w-none space-y-6 sm:space-y-8">
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-text-primary dark:text-white mb-2 sm:mb-3">
                1. Acceptance of Terms
              </h2>
              <p className="text-text-secondary leading-relaxed text-sm sm:text-base text-sm sm:text-base">
                By using SisterCare, you agree to these Terms of Service. If you
                do not agree, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-text-primary dark:text-white mb-2 sm:mb-3">
                2. Medical Disclaimer
              </h2>
              <p className="text-text-secondary leading-relaxed text-sm sm:text-base">
                <strong>
                  SisterCare is not a substitute for professional medical
                  advice.
                </strong>
                Our AI assistant provides educational information only. Always
                consult a qualified healthcare provider for medical concerns. In
                emergencies, contact local emergency services immediately.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-text-primary dark:text-white mb-2 sm:mb-3">
                3. User Responsibilities
              </h2>
              <ul className="list-disc pl-5 sm:pl-6 text-text-secondary space-y-1.5 sm:space-y-2 text-sm sm:text-base">
                <li>Provide accurate information for better predictions</li>
                <li>Keep your account credentials secure</li>
                <li>Use the service respectfully and lawfully</li>
                <li>Report any security concerns immediately</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-text-primary dark:text-white mb-2 sm:mb-3">
                4. Service Availability
              </h2>
              <p className="text-text-secondary leading-relaxed text-sm sm:text-base">
                We strive for 99.9% uptime but cannot guarantee uninterrupted
                service. We may update or modify features to improve user
                experience.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-text-primary dark:text-white mb-2 sm:mb-3">
                5. Contact
              </h2>
              <p className="text-text-secondary leading-relaxed text-sm sm:text-base">
                Questions? Contact us at{" "}
                <a
                  href="mailto:support@sistercare.app"
                  className="text-primary hover:underline active:opacity-70"
                >
                  support@sistercare.app
                </a>
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

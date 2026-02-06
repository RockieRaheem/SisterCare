"use client";

import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-text-secondary text-sm sm:text-base mb-6 sm:mb-8">
            Last updated: February 5, 2026
          </p>

          <div className="prose dark:prose-invert max-w-none space-y-6 sm:space-y-8">
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-text-primary dark:text-white mb-2 sm:mb-3">
                1. Information We Collect
              </h2>
              <p className="text-text-secondary leading-relaxed text-sm sm:text-base text-sm sm:text-base">
                SisterCare collects information you provide directly, including
                your name, email, menstrual cycle data, symptoms, and
                health-related notes. We also collect usage data to improve our
                services. All health data is encrypted and stored securely.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-text-primary dark:text-white mb-2 sm:mb-3">
                2. How We Use Your Information
              </h2>
              <ul className="list-disc pl-5 sm:pl-6 text-text-secondary space-y-1.5 sm:space-y-2 text-sm sm:text-base">
                <li>
                  To provide personalized cycle predictions and health insights
                </li>
                <li>
                  To power our AI assistant with context about your health
                </li>
                <li>
                  To send you reminders and notifications you've opted into
                </li>
                <li>To improve our services and user experience</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-text-primary dark:text-white mb-2 sm:mb-3">
                3. Data Security
              </h2>
              <p className="text-text-secondary leading-relaxed text-sm sm:text-base">
                Your health data is encrypted using industry-standard AES-256
                encryption. We use Firebase's secure infrastructure and never
                share your personal health information with third parties for
                advertising purposes.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-text-primary dark:text-white mb-2 sm:mb-3">
                4. Your Rights
              </h2>
              <p className="text-text-secondary leading-relaxed text-sm sm:text-base">
                You have the right to access, correct, or delete your personal
                data at any time. You can export your data or request complete
                account deletion from the Settings page.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-text-primary dark:text-white mb-2 sm:mb-3">
                5. Contact Us
              </h2>
              <p className="text-text-secondary leading-relaxed text-sm sm:text-base">
                For privacy concerns, contact us at{" "}
                <a
                  href="mailto:privacy@sistercare.app"
                  className="text-primary hover:underline active:opacity-70"
                >
                  privacy@sistercare.app
                </a>
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

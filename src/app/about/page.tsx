"use client";

import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

export default function AboutPage() {
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
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary dark:text-white mb-4 sm:mb-6">
            About SisterCare
          </h1>

          <div className="space-y-4 sm:space-y-6 text-text-secondary leading-relaxed text-sm sm:text-base">
            <p>
              SisterCare was created with a simple mission:{" "}
              <strong className="text-primary">
                every woman and girl deserves access to reliable health
                information and support
              </strong>
              .
            </p>

            <p>
              In many communities, menstrual health remains a taboo topic. Girls
              often lack access to accurate information, leading to confusion,
              shame, and preventable health issues. SisterCare bridges this gap
              by providing a safe, private space for education and support.
            </p>

            <div className="bg-primary/5 dark:bg-primary/10 rounded-lg sm:rounded-xl p-4 sm:p-6 my-6 sm:my-8">
              <h2 className="text-lg sm:text-xl font-bold text-text-primary dark:text-white mb-3 sm:mb-4">
                Our Features
              </h2>
              <ul className="space-y-2.5 sm:space-y-3">
                <li className="flex items-start gap-2 sm:gap-3">
                  <span className="material-symbols-outlined text-primary text-lg sm:text-xl shrink-0">
                    calendar_month
                  </span>
                  <span className="text-xs sm:text-sm">
                    <strong>Cycle Tracking:</strong> Predict periods, track
                    symptoms, understand your body
                  </span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <span className="material-symbols-outlined text-primary text-lg sm:text-xl shrink-0">
                    chat
                  </span>
                  <span className="text-xs sm:text-sm">
                    <strong>AI Assistant:</strong> Ask questions privately, get
                    reliable answers
                  </span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <span className="material-symbols-outlined text-primary text-lg sm:text-xl shrink-0">
                    library_books
                  </span>
                  <span className="text-xs sm:text-sm">
                    <strong>Health Library:</strong> Articles on puberty,
                    hygiene, and wellness
                  </span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <span className="material-symbols-outlined text-primary text-lg sm:text-xl shrink-0">
                    emergency
                  </span>
                  <span className="text-xs sm:text-sm">
                    <strong>Emergency Support:</strong> Quick access to Uganda
                    helplines
                  </span>
                </li>
              </ul>
            </div>

            <p>
              Your privacy is paramount. All data is encrypted and never shared.
              You control your information completely.
            </p>

            <p className="text-center text-base sm:text-lg font-medium text-primary mt-6 sm:mt-8">
              You are never alone. 💜
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

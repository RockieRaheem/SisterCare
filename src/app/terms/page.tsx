"use client";

import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

export default function TermsPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === "dark" ? "dark" : ""}`}>
      <div className="bg-background-light dark:bg-background-dark min-h-screen">
        {/* Header */}
        <header className="bg-white dark:bg-card-dark border-b border-border-light dark:border-border-dark">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined">favorite</span>
              <span className="font-bold text-lg">SisterCare</span>
            </Link>
            <Link href="/" className="text-sm text-primary hover:underline">
              ← Back to Home
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold text-text-primary dark:text-white mb-2">
            Terms of Service
          </h1>
          <p className="text-text-secondary mb-8">
            Last updated: February 5, 2026
          </p>

          <div className="prose dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                1. Acceptance of Terms
              </h2>
              <p className="text-text-secondary leading-relaxed">
                By using SisterCare, you agree to these Terms of Service. If you
                do not agree, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                2. Medical Disclaimer
              </h2>
              <p className="text-text-secondary leading-relaxed">
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
              <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                3. User Responsibilities
              </h2>
              <ul className="list-disc pl-6 text-text-secondary space-y-2">
                <li>Provide accurate information for better predictions</li>
                <li>Keep your account credentials secure</li>
                <li>Use the service respectfully and lawfully</li>
                <li>Report any security concerns immediately</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                4. Service Availability
              </h2>
              <p className="text-text-secondary leading-relaxed">
                We strive for 99.9% uptime but cannot guarantee uninterrupted
                service. We may update or modify features to improve user
                experience.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                5. Contact
              </h2>
              <p className="text-text-secondary leading-relaxed">
                Questions? Contact us at{" "}
                <a
                  href="mailto:support@sistercare.app"
                  className="text-primary hover:underline"
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

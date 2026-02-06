"use client";

import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

const faqs = [
  {
    q: "How does cycle prediction work?",
    a: "SisterCare uses your logged period dates to calculate your average cycle length and predict future periods. The more data you log, the more accurate predictions become.",
  },
  {
    q: "Is my health data private?",
    a: "Yes! All your data is encrypted and stored securely. We never share personal health information with third parties for advertising. You can delete your data anytime from Settings.",
  },
  {
    q: "How do I log my period?",
    a: "Go to Dashboard and tap 'Log Period Start' when your period begins. You can also log symptoms daily using the symptom tracker.",
  },
  {
    q: "Can I export my data?",
    a: "Yes, go to Settings > Data & Privacy to export all your cycle and symptom data.",
  },
  {
    q: "Is the AI chat advice medical advice?",
    a: "No. Our AI assistant provides educational information only. Always consult a healthcare provider for medical concerns.",
  },
  {
    q: "What is Sauti 116?",
    a: "Sauti 116 is Uganda's free 24/7 helpline for children and women experiencing violence or abuse. It's completely free to call.",
  },
];

export default function HelpPage() {
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
            Help Center
          </h1>
          <p className="text-text-secondary text-sm sm:text-base mb-6 sm:mb-8">
            Find answers to common questions
          </p>

          {/* Emergency Banner */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-6 sm:mb-8">
            <h3 className="font-bold text-red-700 dark:text-red-300 flex items-center gap-2 mb-1.5 sm:mb-2 text-sm sm:text-base">
              <span className="material-symbols-outlined text-lg sm:text-xl">
                emergency
              </span>
              Need Urgent Help?
            </h3>
            <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm">
              <strong>Sauti 116:</strong> Free 24/7 helpline •{" "}
              <strong>Police:</strong> 999 or 112 •
              <strong> FIDA Uganda:</strong> 0414 530 848
            </p>
          </div>

          {/* FAQs */}
          <div className="space-y-3 sm:space-y-4">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="bg-white dark:bg-card-dark rounded-lg sm:rounded-xl border border-border-light dark:border-border-dark p-3 sm:p-4 group"
              >
                <summary className="font-semibold text-text-primary dark:text-white cursor-pointer flex items-center justify-between text-sm sm:text-base">
                  {faq.q}
                  <span className="material-symbols-outlined text-primary group-open:rotate-180 transition-transform text-lg sm:text-xl ml-2 shrink-0">
                    expand_more
                  </span>
                </summary>
                <p className="mt-2 sm:mt-3 text-text-secondary leading-relaxed text-xs sm:text-sm">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>

          {/* Contact */}
          <div className="mt-8 sm:mt-10 md:mt-12 bg-primary/5 dark:bg-primary/10 rounded-lg sm:rounded-xl p-4 sm:p-6 text-center">
            <h3 className="font-bold text-text-primary dark:text-white mb-1.5 sm:mb-2 text-sm sm:text-base">
              Still need help?
            </h3>
            <p className="text-text-secondary mb-3 sm:mb-4 text-xs sm:text-sm">
              Our team is here for you
            </p>
            <div className="flex flex-col xs:flex-row justify-center gap-2 sm:gap-4">
              <Link
                href="/chat"
                className="bg-primary text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-medium hover:bg-primary/90 active:bg-primary/80 transition text-sm touch-target"
              >
                Chat with Sister
              </Link>
              <a
                href="mailto:support@sistercare.app"
                className="border border-primary text-primary px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-medium hover:bg-primary/10 active:bg-primary/20 transition text-sm touch-target"
              >
                Email Support
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

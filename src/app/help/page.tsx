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
            Help Center
          </h1>
          <p className="text-text-secondary mb-8">
            Find answers to common questions
          </p>

          {/* Emergency Banner */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-8">
            <h3 className="font-bold text-red-700 dark:text-red-300 flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined">emergency</span>
              Need Urgent Help?
            </h3>
            <p className="text-red-600 dark:text-red-400 text-sm">
              <strong>Sauti 116:</strong> Free 24/7 helpline •{" "}
              <strong>Police:</strong> 999 or 112 •
              <strong> FIDA Uganda:</strong> 0414 530 848
            </p>
          </div>

          {/* FAQs */}
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="bg-white dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 group"
              >
                <summary className="font-semibold text-text-primary dark:text-white cursor-pointer flex items-center justify-between">
                  {faq.q}
                  <span className="material-symbols-outlined text-primary group-open:rotate-180 transition-transform">
                    expand_more
                  </span>
                </summary>
                <p className="mt-3 text-text-secondary leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>

          {/* Contact */}
          <div className="mt-12 bg-primary/5 dark:bg-primary/10 rounded-xl p-6 text-center">
            <h3 className="font-bold text-text-primary dark:text-white mb-2">
              Still need help?
            </h3>
            <p className="text-text-secondary mb-4">Our team is here for you</p>
            <div className="flex justify-center gap-4">
              <Link
                href="/chat"
                className="bg-primary text-white px-6 py-2 rounded-full font-medium hover:bg-primary/90 transition"
              >
                Chat with Sister
              </Link>
              <a
                href="mailto:support@sistercare.app"
                className="border border-primary text-primary px-6 py-2 rounded-full font-medium hover:bg-primary/10 transition"
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

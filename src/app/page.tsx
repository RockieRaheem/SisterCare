"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-white dark:bg-background-dark">
      <Header variant="landing" />

      <main className="flex-1">
        {/* Hero Section - Clean and focused */}
        <section
          id="mission"
          className="relative min-h-[80vh] flex items-center scroll-mt-20 pt-safe"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-purple-50/50 to-white dark:from-purple-950/20 dark:to-background-dark" />

          <div className="relative w-full px-4 sm:px-6 lg:px-20 py-16 sm:py-20 lg:py-24">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-text-primary dark:text-white mb-6">
                Your Cycle, <span className="text-primary">Your Way</span>
              </h1>

              <p className="text-lg sm:text-xl text-text-secondary dark:text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
                Track your period, get reminders, and chat with Sister — a
                judgment-free AI companion. Built for Ugandan women, completely
                free, 100% private.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-full h-14 px-8 bg-primary hover:bg-primary/90 text-white font-semibold transition-colors touch-target"
                >
                  Get Started Free
                  <span className="material-symbols-outlined text-xl">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full h-14 px-8 bg-gray-100 dark:bg-gray-800 text-text-primary dark:text-white font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors touch-target"
                >
                  Sign In
                </Link>
              </div>

              <div className="flex items-center justify-center gap-6 text-sm text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-green-500 text-lg">
                    check_circle
                  </span>
                  Free Forever
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-green-500 text-lg">
                    check_circle
                  </span>
                  No Ads
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-green-500 text-lg">
                    check_circle
                  </span>
                  Private
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - Simple grid */}
        <section
          id="features"
          className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-20 bg-gray-50 dark:bg-gray-900/50 scroll-mt-20"
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12 lg:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-text-primary dark:text-white mb-4">
                Everything You Need
              </h2>
              <p className="text-lg text-text-secondary dark:text-gray-400 max-w-xl mx-auto">
                Simple tools to help you understand your body better.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature 1 */}
              <div className="text-center p-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-primary text-2xl">
                    calendar_month
                  </span>
                </div>
                <h3 className="font-semibold text-text-primary dark:text-white mb-2">
                  Period Tracking
                </h3>
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  Log your cycle with one tap. Smart predictions that learn your
                  patterns.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="text-center p-6">
                <div className="w-14 h-14 rounded-2xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-pink-500 text-2xl">
                    chat_bubble
                  </span>
                </div>
                <h3 className="font-semibold text-text-primary dark:text-white mb-2">
                  Sister Chat
                </h3>
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  Ask anything without embarrassment. Your AI companion who
                  truly understands.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="text-center p-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-blue-500 text-2xl">
                    notifications_active
                  </span>
                </div>
                <h3 className="font-semibold text-text-primary dark:text-white mb-2">
                  Smart Reminders
                </h3>
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  Discreet notifications before your period so you&apos;re
                  always prepared.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="text-center p-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-emerald-500 text-2xl">
                    support_agent
                  </span>
                </div>
                <h3 className="font-semibold text-text-primary dark:text-white mb-2">
                  Real Counsellors
                </h3>
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  Connect with verified professionals when you need human
                  support.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Section - Clean */}
        <section
          id="privacy"
          className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-20 scroll-mt-20"
        >
          <div className="max-w-5xl mx-auto">
            <div className="bg-primary rounded-3xl p-8 sm:p-12 lg:p-16 text-white text-center">
              <span className="material-symbols-outlined text-5xl mb-6 opacity-90">
                lock
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Your Privacy is Sacred
              </h2>
              <p className="text-lg text-white/80 max-w-xl mx-auto mb-8">
                Your health data is deeply personal. We never sell your data,
                show ads, or track you. Delete everything anytime.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <span className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                  <span className="material-symbols-outlined text-lg">
                    verified
                  </span>
                  Encrypted
                </span>
                <span className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                  <span className="material-symbols-outlined text-lg">
                    block
                  </span>
                  Never Sold
                </span>
                <span className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                  <span className="material-symbols-outlined text-lg">
                    visibility_off
                  </span>
                  No Tracking
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* How it works - Clean */}
        <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-20 bg-gray-50 dark:bg-gray-900/50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-text-primary dark:text-white mb-4">
                Get Started in 3 Steps
              </h2>
            </div>

            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="w-10 h-10 rounded-full bg-primary text-white font-bold flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary dark:text-white mb-1">
                    Create Your Free Account
                  </h3>
                  <p className="text-text-secondary dark:text-gray-400">
                    Sign up with your email in under a minute. No credit card
                    needed.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-10 h-10 rounded-full bg-primary text-white font-bold flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary dark:text-white mb-1">
                    Enter Your Cycle Info
                  </h3>
                  <p className="text-text-secondary dark:text-gray-400">
                    Enter your last period date and cycle length. We&apos;ll
                    handle the rest.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-10 h-10 rounded-full bg-primary text-white font-bold flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary dark:text-white mb-1">
                    Start Your Journey
                  </h3>
                  <p className="text-text-secondary dark:text-gray-400">
                    Log periods, track symptoms, chat with Sister. The more you
                    use it, the smarter it gets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section - Clean */}
        <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-20 safe-bottom">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary dark:text-white mb-4">
              Ready to Begin?
            </h2>
            <p className="text-lg text-text-secondary dark:text-gray-400 mb-8">
              Join women who&apos;ve found a better way to understand their
              bodies.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full h-14 px-8 bg-primary hover:bg-primary/90 text-white font-semibold transition-colors touch-target"
              >
                Start Free
                <span className="material-symbols-outlined text-xl">
                  arrow_forward
                </span>
              </Link>
              <Link
                href="/counsellors"
                className="inline-flex items-center justify-center gap-2 rounded-full h-14 px-8 bg-gray-100 dark:bg-gray-800 text-text-primary dark:text-white font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors touch-target"
              >
                <span className="material-symbols-outlined text-emerald-500 text-xl">
                  support_agent
                </span>
                Talk to a Counsellor
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

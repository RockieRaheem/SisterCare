"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
      <Header variant="landing" />

      <main className="flex-1">
        {/* Hero Section */}
        <section
          id="mission"
          className="relative min-h-[90vh] flex items-center scroll-mt-20 overflow-hidden"
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50/50 to-white dark:from-purple-950/30 dark:via-pink-950/20 dark:to-background-dark" />

          {/* Animated floating shapes */}
          <div className="absolute top-10 right-[5%] w-80 h-80 bg-gradient-to-br from-purple-300/40 to-pink-300/40 dark:from-purple-800/30 dark:to-pink-800/30 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute top-40 left-[10%] w-64 h-64 bg-gradient-to-br from-pink-200/50 to-purple-200/50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute bottom-20 right-[20%] w-72 h-72 bg-gradient-to-br from-primary/20 to-pink-300/30 dark:from-primary/10 dark:to-pink-800/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          />
          <div className="absolute bottom-10 left-[5%] w-96 h-96 bg-pink-100/60 dark:bg-pink-900/10 rounded-full blur-3xl" />

          {/* Decorative dots pattern */}
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #8c30e8 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />

          <div className="relative w-full px-6 lg:px-20 py-20">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                {/* Left Content */}
                <div className="flex-1 text-center lg:text-left">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-purple-100 dark:border-purple-800/50 shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-sm font-medium text-text-primary dark:text-white">
                      Your Safe Space for Wellness
                    </span>
                  </div>

                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] text-text-primary dark:text-white mb-6">
                    Your Body.{" "}
                    <span className="relative">
                      <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                        Your Journey.
                      </span>
                      <svg
                        className="absolute -bottom-2 left-0 w-full"
                        viewBox="0 0 300 12"
                        fill="none"
                      >
                        <path
                          d="M2 10C50 4 100 4 150 6C200 8 250 4 298 10"
                          stroke="url(#gradient)"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient
                            id="gradient"
                            x1="0"
                            y1="0"
                            x2="300"
                            y2="0"
                          >
                            <stop stopColor="#8c30e8" />
                            <stop offset="1" stopColor="#ec4899" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </span>
                    <span className="block mt-2">Your Sister.</span>
                  </h1>

                  <p className="text-lg md:text-xl text-text-secondary dark:text-gray-400 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                    Track your cycle effortlessly, get gentle reminders before
                    your period, chat with a{" "}
                    <span className="text-primary font-semibold">
                      judgment-free AI companion
                    </span>{" "}
                    who truly gets it, and connect with{" "}
                    <span className="text-primary font-semibold">
                      real counsellors
                    </span>{" "}
                    when you need human support.
                  </p>

                  {/* Feature pills */}
                  <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-8">
                    <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/30 rounded-full px-4 py-2">
                      <span className="material-symbols-outlined text-primary text-lg">
                        calendar_month
                      </span>
                      <span className="text-sm font-medium text-text-primary dark:text-white">
                        Period Tracking
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-pink-50 dark:bg-pink-900/30 rounded-full px-4 py-2">
                      <span className="material-symbols-outlined text-pink-500 text-lg">
                        smart_toy
                      </span>
                      <span className="text-sm font-medium text-text-primary dark:text-white">
                        AI Companion
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 rounded-full px-4 py-2">
                      <span className="material-symbols-outlined text-blue-500 text-lg">
                        notifications_active
                      </span>
                      <span className="text-sm font-medium text-text-primary dark:text-white">
                        Smart Reminders
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-full px-4 py-2">
                      <span className="material-symbols-outlined text-emerald-500 text-lg">
                        support_agent
                      </span>
                      <span className="text-sm font-medium text-text-primary dark:text-white">
                        Real Counsellors
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <Link
                      href="/auth/signup"
                      className="group inline-flex items-center justify-center gap-2 rounded-2xl h-14 px-8 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white text-base font-semibold shadow-xl shadow-primary/30 transition-all transform hover:scale-[1.02] hover:-translate-y-0.5"
                    >
                      Begin Your Journey — Free
                      <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </Link>
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl h-14 px-8 bg-white dark:bg-gray-800 text-text-primary dark:text-white text-base font-semibold border-2 border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-all transform hover:scale-[1.02]"
                    >
                      <span className="material-symbols-outlined text-lg">
                        login
                      </span>
                      Welcome Back
                    </Link>
                  </div>

                  <div className="mt-8 flex items-center gap-6 justify-center lg:justify-start">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-green-500">
                        verified_user
                      </span>
                      <span className="text-sm text-text-secondary">
                        100% Free
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-green-500">
                        lock
                      </span>
                      <span className="text-sm text-text-secondary">
                        Private & Secure
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-green-500">
                        favorite
                      </span>
                      <span className="text-sm text-text-secondary">
                        Made for You
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right - Enhanced App Preview */}
                <div className="flex-1 w-full max-w-lg">
                  <div className="relative">
                    {/* Glow effect behind card */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-purple-500/20 to-pink-500/30 rounded-[2rem] blur-2xl transform scale-105" />

                    {/* Main card */}
                    <div className="relative bg-white/90 dark:bg-card-dark/90 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 shadow-2xl border border-white/50 dark:border-gray-700/50">
                      {/* App header mockup */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-xl">
                              favorite
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-text-primary dark:text-white">
                              SisterCare
                            </p>
                            <p className="text-xs text-text-secondary">
                              Your cycle companion
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <span className="material-symbols-outlined text-text-secondary text-lg">
                              notifications
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cycle visualization */}
                      <div className="bg-gradient-to-br from-primary/5 via-purple-50 to-pink-50 dark:from-primary/10 dark:via-purple-900/20 dark:to-pink-900/10 rounded-2xl p-5 mb-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-xs text-text-secondary uppercase tracking-wider">
                              Current Cycle
                            </p>
                            <p className="text-3xl font-bold text-text-primary dark:text-white">
                              Day 12
                            </p>
                          </div>
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center shadow-lg shadow-primary/30">
                            <span className="material-symbols-outlined text-white text-2xl">
                              cycle
                            </span>
                          </div>
                        </div>
                        <div className="h-3 bg-gray-200/80 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full w-[43%] bg-gradient-to-r from-primary via-purple-500 to-pink-400 rounded-full relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30 rounded-full" />
                          </div>
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="text-xs text-text-secondary">
                            Follicular Phase
                          </span>
                          <span className="text-xs font-medium text-primary">
                            ~8 days to ovulation
                          </span>
                        </div>
                      </div>

                      {/* Quick actions grid */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer">
                          <span className="material-symbols-outlined text-pink-500 text-xl mb-1">
                            edit_note
                          </span>
                          <p className="text-xs font-medium text-text-primary dark:text-white">
                            Log
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer">
                          <span className="material-symbols-outlined text-purple-500 text-xl mb-1">
                            chat_bubble
                          </span>
                          <p className="text-xs font-medium text-text-primary dark:text-white">
                            Chat
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer">
                          <span className="material-symbols-outlined text-emerald-500 text-xl mb-1">
                            support_agent
                          </span>
                          <p className="text-xs font-medium text-text-primary dark:text-white">
                            Help
                          </p>
                        </div>
                      </div>

                      {/* AI Chat preview */}
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-white text-sm">
                              smart_toy
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-primary mb-1">
                              Sister AI
                            </p>
                            <p className="text-sm text-text-primary dark:text-white leading-relaxed">
                              Hi beautiful! How are you feeling today? I&apos;m
                              here to listen — no judgment, just support. 💜
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Floating elements */}
                    <div
                      className="absolute -top-4 -left-4 bg-white dark:bg-gray-800 rounded-xl px-4 py-2 shadow-lg border border-gray-100 dark:border-gray-700 animate-bounce"
                      style={{ animationDuration: "3s" }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-500 text-lg">
                          notifications_active
                        </span>
                        <span className="text-sm font-medium text-text-primary dark:text-white">
                          Period in 3 days
                        </span>
                      </div>
                    </div>

                    <div className="absolute -bottom-4 -right-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2 shadow-lg">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-600 text-lg">
                          shield
                        </span>
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          Private & Encrypted
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trusted By Section */}
        <section className="py-12 px-6 lg:px-20 border-y border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/30">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
              <p className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                Designed with love for
              </p>
              <div className="flex items-center gap-8 md:gap-12">
                <div className="flex items-center gap-2 text-text-primary dark:text-white">
                  <span className="material-symbols-outlined text-primary">
                    location_on
                  </span>
                  <span className="font-semibold">Ugandan Women</span>
                </div>
                <div className="flex items-center gap-2 text-text-primary dark:text-white">
                  <span className="material-symbols-outlined text-pink-500">
                    diversity_3
                  </span>
                  <span className="font-semibold">All Ages</span>
                </div>
                <div className="flex items-center gap-2 text-text-primary dark:text-white">
                  <span className="material-symbols-outlined text-purple-500">
                    spa
                  </span>
                  <span className="font-semibold">Your Wellness</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why SisterCare Section */}
        <section
          id="features"
          className="py-20 lg:py-28 px-6 lg:px-20 bg-white dark:bg-card-dark scroll-mt-20"
        >
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary dark:text-white mb-4">
                Why women choose SisterCare
              </h2>
              <p className="text-lg text-text-secondary dark:text-gray-400">
                Built with care for women who want a simple, respectful way to
                understand their bodies.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <span className="material-symbols-outlined text-primary text-xl">
                    calendar_month
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">
                  Simple cycle tracking
                </h3>
                <p className="text-text-secondary dark:text-gray-400 leading-relaxed">
                  Log your period with a tap. We&apos;ll help predict when your
                  next one might come based on your personal patterns.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group">
                <div className="w-12 h-12 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-5 group-hover:bg-pink-200 dark:group-hover:bg-pink-900/50 transition-colors">
                  <span className="material-symbols-outlined text-pink-600 dark:text-pink-400 text-xl">
                    chat
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">
                  Chat with Sister AI
                </h3>
                <p className="text-text-secondary dark:text-gray-400 leading-relaxed">
                  Ask questions about your cycle, symptoms, or health concerns.
                  Get helpful answers anytime, with cultural sensitivity.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-5 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">
                    notifications
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">
                  Gentle reminders
                </h3>
                <p className="text-text-secondary dark:text-gray-400 leading-relaxed">
                  Get notified before your period arrives so you can prepare.
                  Customize what you want to be reminded about.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="group">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-5 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-xl">
                    menu_book
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">
                  Learn about your health
                </h3>
                <p className="text-text-secondary dark:text-gray-400 leading-relaxed">
                  Browse articles on menstrual health, reproductive wellness,
                  and self-care written for Ugandan women.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="group">
                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-5 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
                  <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-xl">
                    mood
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">
                  Track how you feel
                </h3>
                <p className="text-text-secondary dark:text-gray-400 leading-relaxed">
                  Log symptoms, moods, and energy levels. Over time, you&apos;ll
                  see patterns that help you understand your body better.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="group">
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-5 group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-xl">
                    support
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">
                  Help when you need it
                </h3>
                <p className="text-text-secondary dark:text-gray-400 leading-relaxed">
                  Quick access to Sauti 116 helpline and trusted resources if
                  you ever need urgent support.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section
          id="privacy"
          className="py-20 lg:py-28 px-6 lg:px-20 scroll-mt-20"
        >
          <div className="max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-purple-900 via-primary to-purple-800 rounded-3xl p-10 md:p-16 text-white relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative flex flex-col lg:flex-row items-center gap-12">
                <div className="flex-1">
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">
                    Your privacy comes first
                  </h2>
                  <p className="text-lg text-white/80 mb-8 leading-relaxed">
                    We know health data is personal. That&apos;s why we built
                    SisterCare with privacy at its core. Your information
                    belongs to you.
                  </p>

                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-pink-300 mt-0.5">
                        check_circle
                      </span>
                      <span>Your data is stored securely and encrypted</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-pink-300 mt-0.5">
                        check_circle
                      </span>
                      <span>We never sell your information to anyone</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-pink-300 mt-0.5">
                        check_circle
                      </span>
                      <span>Delete your account and data anytime you want</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-pink-300 mt-0.5">
                        check_circle
                      </span>
                      <span>
                        No tracking, no ads, no hidden data collection
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="flex-shrink-0">
                  <div className="w-40 h-40 md:w-48 md:h-48 rounded-full bg-white/10 flex items-center justify-center">
                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-5xl md:text-6xl text-white">
                        shield
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 lg:py-28 px-6 lg:px-20 bg-gray-50 dark:bg-gray-900/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary dark:text-white mb-4">
                Get started in minutes
              </h2>
              <p className="text-lg text-text-secondary dark:text-gray-400 max-w-xl mx-auto">
                No complicated setup. Just create an account and start tracking.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                  1
                </div>
                <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">
                  Create your account
                </h3>
                <p className="text-text-secondary dark:text-gray-400">
                  Sign up with your email. It takes less than a minute and
                  it&apos;s completely free.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                  2
                </div>
                <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">
                  Tell us about your cycle
                </h3>
                <p className="text-text-secondary dark:text-gray-400">
                  Enter your last period date and average cycle length.
                  We&apos;ll take it from there.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                  3
                </div>
                <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">
                  Start tracking
                </h3>
                <p className="text-text-secondary dark:text-gray-400">
                  Log your periods, symptoms, and moods. The more you track, the
                  smarter predictions get.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-28 px-6 lg:px-20">
          <div className="max-w-3xl mx-auto text-center">
            <span className="material-symbols-outlined text-primary text-5xl mb-6">
              favorite
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary dark:text-white mb-4">
              Ready to understand your body better?
            </h2>
            <p className="text-lg text-text-secondary dark:text-gray-400 mb-10 max-w-xl mx-auto">
              Join SisterCare today. It&apos;s free, private, and designed with
              you in mind.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl h-14 px-10 bg-primary hover:bg-primary/90 text-white text-lg font-semibold shadow-lg shadow-primary/25 transition-all"
            >
              Create free account
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

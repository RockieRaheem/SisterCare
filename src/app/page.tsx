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
          className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center scroll-mt-20 overflow-hidden pt-safe"
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50/50 to-white dark:from-purple-950/30 dark:via-pink-950/20 dark:to-background-dark" />

          {/* Animated floating shapes - smaller on mobile */}
          <div className="absolute top-10 right-[5%] w-48 sm:w-64 md:w-80 h-48 sm:h-64 md:h-80 bg-gradient-to-br from-purple-300/40 to-pink-300/40 dark:from-purple-800/30 dark:to-pink-800/30 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute top-40 left-[10%] w-40 sm:w-52 md:w-64 h-40 sm:h-52 md:h-64 bg-gradient-to-br from-pink-200/50 to-purple-200/50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute bottom-20 right-[20%] w-44 sm:w-56 md:w-72 h-44 sm:h-56 md:h-72 bg-gradient-to-br from-primary/20 to-pink-300/30 dark:from-primary/10 dark:to-pink-800/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          />
          <div className="absolute bottom-10 left-[5%] w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-pink-100/60 dark:bg-pink-900/10 rounded-full blur-3xl" />

          {/* Decorative dots pattern */}
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #8c30e8 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />

          <div className="relative w-full px-4 sm:px-6 lg:px-20 py-12 sm:py-16 lg:py-20">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-10 lg:gap-20">
                {/* Left Content */}
                <div className="flex-1 text-center lg:text-left">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 mb-4 sm:mb-6 border border-purple-100 dark:border-purple-800/50 shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-text-primary dark:text-white">
                      Your Safe Space for Wellness
                    </span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] text-text-primary dark:text-white mb-4 sm:mb-6">
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

                  <p className="text-base sm:text-lg md:text-xl text-text-secondary dark:text-gray-400 max-w-xl mx-auto lg:mx-0 mb-6 sm:mb-8 leading-relaxed">
                    Track your cycle effortlessly, get gentle reminders before
                    your period, chat with a{" "}
                    <span className="text-primary font-semibold">
                      judgment-free wellness companion
                    </span>{" "}
                    who truly gets it, and connect with{" "}
                    <span className="text-primary font-semibold">
                      real counsellors
                    </span>{" "}
                    when you need human support.
                  </p>

                  {/* Feature pills */}
                  <div className="flex flex-wrap gap-2 sm:gap-3 justify-center lg:justify-start mb-6 sm:mb-8">
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-purple-50 dark:bg-purple-900/30 rounded-full px-3 sm:px-4 py-1.5 sm:py-2">
                      <span className="material-symbols-outlined text-primary text-base sm:text-lg">
                        calendar_month
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-text-primary dark:text-white">
                        Period Tracking
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-pink-50 dark:bg-pink-900/30 rounded-full px-3 sm:px-4 py-1.5 sm:py-2">
                      <span className="material-symbols-outlined text-pink-500 text-base sm:text-lg">
                        chat_bubble
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-text-primary dark:text-white">
                        Sister Chat
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-blue-50 dark:bg-blue-900/30 rounded-full px-3 sm:px-4 py-1.5 sm:py-2">
                      <span className="material-symbols-outlined text-blue-500 text-base sm:text-lg">
                        notifications_active
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-text-primary dark:text-white">
                        Smart Reminders
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-full px-3 sm:px-4 py-1.5 sm:py-2">
                      <span className="material-symbols-outlined text-emerald-500 text-base sm:text-lg">
                        support_agent
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-text-primary dark:text-white">
                        Real Counsellors
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                    <Link
                      href="/auth/signup"
                      className="group inline-flex items-center justify-center gap-2 rounded-2xl h-12 sm:h-14 px-6 sm:px-8 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white text-sm sm:text-base font-semibold shadow-xl shadow-primary/30 transition-all transform hover:scale-[1.02] hover:-translate-y-0.5 touch-target"
                    >
                      Begin Your Journey — Free
                      <span className="material-symbols-outlined text-lg sm:text-xl group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </Link>
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl h-12 sm:h-14 px-6 sm:px-8 bg-white dark:bg-gray-800 text-text-primary dark:text-white text-sm sm:text-base font-semibold border-2 border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-all transform hover:scale-[1.02] touch-target"
                    >
                      <span className="material-symbols-outlined text-base sm:text-lg">
                        login
                      </span>
                      Welcome Back
                    </Link>
                  </div>

                  <div className="mt-6 sm:mt-8 flex items-center gap-4 sm:gap-6 justify-center lg:justify-start flex-wrap">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="material-symbols-outlined text-green-500 text-base sm:text-lg">
                        verified_user
                      </span>
                      <span className="text-xs sm:text-sm text-text-secondary">
                        100% Free
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="material-symbols-outlined text-green-500 text-base sm:text-lg">
                        lock
                      </span>
                      <span className="text-xs sm:text-sm text-text-secondary">
                        Private & Secure
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="material-symbols-outlined text-green-500 text-base sm:text-lg">
                        favorite
                      </span>
                      <span className="text-xs sm:text-sm text-text-secondary">
                        Made for You
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right - Enhanced App Preview */}
                <div className="flex-1 w-full max-w-sm sm:max-w-md lg:max-w-lg">
                  <div className="relative">
                    {/* Glow effect behind card */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-purple-500/20 to-pink-500/30 rounded-[1.5rem] sm:rounded-[2rem] blur-2xl transform scale-105" />

                    {/* Main card */}
                    <div className="relative bg-white/90 dark:bg-card-dark/90 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 md:p-8 shadow-2xl border border-white/50 dark:border-gray-700/50">
                      {/* App header mockup */}
                      <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-lg sm:text-xl">
                              favorite
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-text-primary dark:text-white text-sm sm:text-base">
                              SisterCare
                            </p>
                            <p className="text-[10px] sm:text-xs text-text-secondary">
                              Your cycle companion
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <span className="material-symbols-outlined text-text-secondary text-base sm:text-lg">
                              notifications
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cycle visualization */}
                      <div className="bg-gradient-to-br from-primary/5 via-purple-50 to-pink-50 dark:from-primary/10 dark:via-purple-900/20 dark:to-pink-900/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 mb-3 sm:mb-4">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <div>
                            <p className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-wider">
                              Current Cycle
                            </p>
                            <p className="text-2xl sm:text-3xl font-bold text-text-primary dark:text-white">
                              Day 12
                            </p>
                          </div>
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center shadow-lg shadow-primary/30">
                            <span className="material-symbols-outlined text-white text-lg sm:text-2xl">
                              cycle
                            </span>
                          </div>
                        </div>
                        <div className="h-2 sm:h-3 bg-gray-200/80 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full w-[43%] bg-gradient-to-r from-primary via-purple-500 to-pink-400 rounded-full relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30 rounded-full" />
                          </div>
                        </div>
                        <div className="flex justify-between mt-1.5 sm:mt-2">
                          <span className="text-[10px] sm:text-xs text-text-secondary">
                            Follicular Phase
                          </span>
                          <span className="text-[10px] sm:text-xs font-medium text-primary">
                            ~8 days to ovulation
                          </span>
                        </div>
                      </div>

                      {/* Quick actions grid */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer">
                          <span className="material-symbols-outlined text-pink-500 text-lg sm:text-xl mb-0.5 sm:mb-1">
                            edit_note
                          </span>
                          <p className="text-[10px] sm:text-xs font-medium text-text-primary dark:text-white">
                            Log
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer">
                          <span className="material-symbols-outlined text-purple-500 text-lg sm:text-xl mb-0.5 sm:mb-1">
                            chat_bubble
                          </span>
                          <p className="text-[10px] sm:text-xs font-medium text-text-primary dark:text-white">
                            Chat
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer">
                          <span className="material-symbols-outlined text-emerald-500 text-lg sm:text-xl mb-0.5 sm:mb-1">
                            support_agent
                          </span>
                          <p className="text-[10px] sm:text-xs font-medium text-text-primary dark:text-white">
                            Help
                          </p>
                        </div>
                      </div>

                      {/* AI Chat preview */}
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-white text-xs sm:text-sm">
                              smart_toy
                            </span>
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs font-semibold text-primary mb-0.5 sm:mb-1">
                              Sister
                            </p>
                            <p className="text-xs sm:text-sm text-text-primary dark:text-white leading-relaxed">
                              Hi beautiful! How are you feeling today? I&apos;m
                              here to listen — no judgment, just support. 💜
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Floating elements - hidden on smallest mobile */}
                    <div
                      className="hidden sm:block absolute -top-3 sm:-top-4 -left-3 sm:-left-4 bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 shadow-lg border border-gray-100 dark:border-gray-700 animate-bounce"
                      style={{ animationDuration: "3s" }}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="material-symbols-outlined text-blue-500 text-base sm:text-lg">
                          notifications_active
                        </span>
                        <span className="text-xs sm:text-sm font-medium text-text-primary dark:text-white">
                          Period in 3 days
                        </span>
                      </div>
                    </div>

                    <div className="hidden sm:block absolute -bottom-3 sm:-bottom-4 -right-3 sm:-right-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 shadow-lg">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="material-symbols-outlined text-green-600 text-base sm:text-lg">
                          shield
                        </span>
                        <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-400">
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
        <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-20 border-y border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/30">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-6 md:gap-16">
              <p className="text-xs sm:text-sm font-medium text-text-secondary uppercase tracking-wider text-center">
                Designed with love for
              </p>
              <div className="flex items-center gap-4 sm:gap-6 md:gap-12 flex-wrap justify-center">
                <div className="flex items-center gap-1.5 sm:gap-2 text-text-primary dark:text-white">
                  <span className="material-symbols-outlined text-primary text-base sm:text-lg">
                    location_on
                  </span>
                  <span className="font-semibold text-sm sm:text-base">
                    Ugandan Women
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-text-primary dark:text-white">
                  <span className="material-symbols-outlined text-pink-500 text-base sm:text-lg">
                    diversity_3
                  </span>
                  <span className="font-semibold text-sm sm:text-base">
                    All Ages
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-text-primary dark:text-white">
                  <span className="material-symbols-outlined text-purple-500 text-base sm:text-lg">
                    spa
                  </span>
                  <span className="font-semibold text-sm sm:text-base">
                    Your Wellness
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why SisterCare Section */}
        <section
          id="features"
          className="py-12 sm:py-16 lg:py-32 px-4 sm:px-6 lg:px-20 bg-gradient-to-b from-white via-purple-50/30 to-white dark:from-card-dark dark:via-purple-950/10 dark:to-card-dark scroll-mt-20 relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute top-20 left-0 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-0 w-56 sm:w-64 md:w-80 h-56 sm:h-64 md:h-80 bg-pink-200/30 dark:bg-pink-900/10 rounded-full blur-3xl" />

          <div className="max-w-6xl mx-auto relative">
            <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 lg:mb-16">
              <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 bg-primary/10 text-primary font-semibold text-xs sm:text-sm rounded-full mb-3 sm:mb-4">
                Everything You Need
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-text-primary dark:text-white mb-4 sm:mb-6">
                Why Women Love{" "}
                <span className="bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                  SisterCare
                </span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-text-secondary dark:text-gray-400 px-2">
                Built with care, compassion, and cultural understanding for
                women who deserve a simple, respectful way to embrace their
                wellness journey.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {/* Feature 1 - Cycle Tracking */}
              <div className="group bg-white dark:bg-gray-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-primary/20 hover:-translate-y-1 transition-all duration-300">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mb-4 sm:mb-5 shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-white text-xl sm:text-2xl">
                    calendar_month
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-text-primary dark:text-white mb-2 sm:mb-3">
                  Smart Cycle Tracking
                </h3>
                <p className="text-text-secondary dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                  Log your period with a tap. Our smart predictions learn your
                  unique patterns to forecast your next cycle with precision.
                </p>
              </div>

              {/* Feature 2 - Sister Chat */}
              <div className="group bg-white dark:bg-gray-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-pink-200 hover:-translate-y-1 transition-all duration-300">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mb-4 sm:mb-5 shadow-lg shadow-pink-500/25 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-white text-xl sm:text-2xl">
                    chat_bubble
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-text-primary dark:text-white mb-2 sm:mb-3">
                  Your Judgment-Free Sister
                </h3>
                <p className="text-text-secondary dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                  Ask anything about your body without embarrassment. Sister
                  listens with empathy and responds with culturally-aware
                  guidance.
                </p>
              </div>

              {/* Feature 3 - Reminders */}
              <div className="group bg-white dark:bg-gray-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-blue-200 hover:-translate-y-1 transition-all duration-300">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 sm:mb-5 shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-white text-xl sm:text-2xl">
                    notifications_active
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-text-primary dark:text-white mb-2 sm:mb-3">
                  Gentle Reminders
                </h3>
                <p className="text-text-secondary dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                  Never be caught off guard again. Get discreet notifications
                  before your period arrives so you&apos;re always prepared.
                </p>
              </div>

              {/* Feature 4 - Professional Counsellors */}
              <div className="group bg-white dark:bg-gray-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-emerald-200 hover:-translate-y-1 transition-all duration-300">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4 sm:mb-5 shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-white text-xl sm:text-2xl">
                    support_agent
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-text-primary dark:text-white mb-2 sm:mb-3">
                  Real Human Counsellors
                </h3>
                <p className="text-text-secondary dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                  Connect with verified professional counsellors via WhatsApp or
                  call when you need human support and guidance.
                </p>
              </div>

              {/* Feature 5 - Symptom Tracking */}
              <div className="group bg-white dark:bg-gray-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-orange-200 hover:-translate-y-1 transition-all duration-300">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-4 sm:mb-5 shadow-lg shadow-orange-500/25 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-white text-xl sm:text-2xl">
                    monitoring
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-text-primary dark:text-white mb-2 sm:mb-3">
                  Track How You Feel
                </h3>
                <p className="text-text-secondary dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                  Log symptoms, moods, and energy levels. Discover patterns that
                  help you understand and embrace your body&apos;s rhythm.
                </p>
              </div>

              {/* Feature 6 - Health Library */}
              <div className="group bg-white dark:bg-gray-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-violet-200 hover:-translate-y-1 transition-all duration-300">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 sm:mb-5 shadow-lg shadow-violet-500/25 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-white text-xl sm:text-2xl">
                    auto_stories
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-text-primary dark:text-white mb-2 sm:mb-3">
                  Health Resource Library
                </h3>
                <p className="text-text-secondary dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                  Explore articles on menstrual health, wellness, and self-care
                  — all written with Ugandan women in mind.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section
          id="privacy"
          className="py-12 sm:py-16 lg:py-32 px-4 sm:px-6 lg:px-20 scroll-mt-20"
        >
          <div className="max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-purple-900 via-primary to-pink-700 rounded-2xl sm:rounded-[2rem] lg:rounded-[2.5rem] p-6 sm:p-10 md:p-16 text-white relative overflow-hidden shadow-2xl">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
              <div className="absolute bottom-0 left-0 w-56 h-56 bg-pink-500/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />
              <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-600/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />

              {/* Dots pattern */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, white 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />

              <div className="relative flex flex-col lg:flex-row items-center gap-8 sm:gap-10 lg:gap-16">
                <div className="flex-1">
                  <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 bg-white/10 backdrop-blur-sm text-white/90 font-semibold text-xs sm:text-sm rounded-full mb-4 sm:mb-6 border border-white/20">
                    Your Data, Your Rules
                  </span>
                  <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 sm:mb-6 leading-tight">
                    Your Privacy is <br className="hidden sm:block" />
                    <span className="text-pink-300">Sacred to Us</span>
                  </h2>
                  <p className="text-base sm:text-lg md:text-xl text-white/80 mb-6 sm:mb-10 leading-relaxed">
                    We understand your health data is deeply personal.
                    That&apos;s why privacy isn&apos;t just a feature —
                    it&apos;s the foundation everything is built upon.
                  </p>

                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 border border-white/10">
                      <span className="material-symbols-outlined text-pink-300 text-lg sm:text-xl">
                        lock
                      </span>
                      <span className="font-medium text-xs sm:text-sm">
                        End-to-end encrypted
                      </span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 border border-white/10">
                      <span className="material-symbols-outlined text-pink-300 text-lg sm:text-xl">
                        block
                      </span>
                      <span className="font-medium text-xs sm:text-sm">
                        Never sold to anyone
                      </span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 border border-white/10">
                      <span className="material-symbols-outlined text-pink-300 text-lg sm:text-xl">
                        delete_forever
                      </span>
                      <span className="font-medium text-xs sm:text-sm">
                        Delete anytime
                      </span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 border border-white/10">
                      <span className="material-symbols-outlined text-pink-300 text-lg sm:text-xl">
                        visibility_off
                      </span>
                      <span className="font-medium text-xs sm:text-sm">
                        No ads or tracking
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 relative">
                  {/* Animated rings */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full border border-white/10 animate-pulse"
                      style={{ animationDuration: "3s" }}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-full border border-white/10 animate-pulse"
                      style={{ animationDuration: "2.5s" }}
                    />
                  </div>

                  <div className="relative w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-full bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-2xl">
                    <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-br from-white/20 to-transparent flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl sm:text-5xl md:text-7xl text-white drop-shadow-lg">
                        verified_user
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-12 sm:py-16 lg:py-32 px-4 sm:px-6 lg:px-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/50 dark:to-background-dark relative overflow-hidden">
          {/* Background pattern */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #8c30e8 1.5px, transparent 1.5px)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="max-w-6xl mx-auto relative">
            <div className="text-center mb-10 sm:mb-12 lg:mb-16">
              <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold text-xs sm:text-sm rounded-full mb-3 sm:mb-4">
                Super Easy
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-text-primary dark:text-white mb-3 sm:mb-4">
                Get Started in{" "}
                <span className="bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                  3 Simple Steps
                </span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-text-secondary dark:text-gray-400 max-w-xl mx-auto px-2">
                No complicated setup. No confusing forms. Just you and your
                wellness journey.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6 lg:gap-12">
              {/* Step 1 */}
              <div className="relative">
                <div className="text-center bg-white dark:bg-gray-800/50 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-white text-2xl sm:text-3xl font-bold flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg shadow-primary/30 rotate-3 hover:rotate-0 transition-transform">
                    1
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-text-primary dark:text-white mb-2 sm:mb-3">
                    Create Your Account
                  </h3>
                  <p className="text-text-secondary dark:text-gray-400 text-sm sm:text-base">
                    Sign up with your email in under a minute. Completely free,
                    no credit card needed.
                  </p>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-4 lg:-right-8 transform -translate-y-1/2">
                  <span className="material-symbols-outlined text-primary/30 text-3xl lg:text-4xl">
                    chevron_right
                  </span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="text-center bg-white dark:bg-gray-800/50 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 text-white text-2xl sm:text-3xl font-bold flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg shadow-pink-500/30 -rotate-3 hover:rotate-0 transition-transform">
                    2
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-text-primary dark:text-white mb-2 sm:mb-3">
                    Share Your Cycle Info
                  </h3>
                  <p className="text-text-secondary dark:text-gray-400 text-sm sm:text-base">
                    Enter your last period date and average cycle length.
                    We&apos;ll handle the rest.
                  </p>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-4 lg:-right-8 transform -translate-y-1/2">
                  <span className="material-symbols-outlined text-primary/30 text-3xl lg:text-4xl">
                    chevron_right
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative sm:col-span-2 md:col-span-1 sm:max-w-md sm:mx-auto md:max-w-none">
                <div className="text-center bg-white dark:bg-gray-800/50 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-2xl sm:text-3xl font-bold flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg shadow-emerald-500/30 rotate-3 hover:rotate-0 transition-transform">
                    3
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-text-primary dark:text-white mb-2 sm:mb-3">
                    Start Your Journey
                  </h3>
                  <p className="text-text-secondary dark:text-gray-400 text-sm sm:text-base">
                    Log periods, track symptoms, chat with Sister. The more you
                    use it, the better it understands you.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 sm:py-16 lg:py-32 px-4 sm:px-6 lg:px-20 relative overflow-hidden safe-bottom">
          {/* Decorative background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-50/50 to-pink-50/50 dark:from-primary/10 dark:via-purple-950/20 dark:to-pink-950/10" />
          <div className="absolute top-10 left-[10%] w-48 sm:w-60 md:w-72 h-48 sm:h-60 md:h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-[10%] w-56 sm:w-64 md:w-80 h-56 sm:h-64 md:h-80 bg-pink-300/20 dark:bg-pink-800/10 rounded-full blur-3xl" />

          <div className="max-w-4xl mx-auto text-center relative">
            {/* Floating hearts - hidden on small mobile */}
            <div
              className="hidden sm:block absolute -top-10 left-[20%] text-3xl sm:text-4xl animate-bounce"
              style={{ animationDuration: "2s" }}
            >
              💜
            </div>
            <div
              className="hidden sm:block absolute top-0 right-[15%] text-2xl sm:text-3xl animate-bounce"
              style={{ animationDuration: "2.5s", animationDelay: "0.5s" }}
            >
              💗
            </div>
            <div
              className="hidden sm:block absolute -bottom-5 left-[30%] text-xl sm:text-2xl animate-bounce"
              style={{ animationDuration: "3s", animationDelay: "1s" }}
            >
              ✨
            </div>

            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary to-pink-500 shadow-xl shadow-primary/30 mb-6 sm:mb-8">
              <span className="material-symbols-outlined text-white text-3xl sm:text-4xl">
                favorite
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-text-primary dark:text-white mb-4 sm:mb-6 leading-tight px-2">
              Ready to Embrace <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Your Wellness?
              </span>
            </h2>

            <p className="text-base sm:text-lg md:text-xl text-text-secondary dark:text-gray-400 mb-6 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-2">
              Join thousands of women who&apos;ve discovered a kinder, more
              understanding way to care for themselves. Your journey to wellness
              starts here.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2">
              <Link
                href="/auth/signup"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl h-14 sm:h-16 px-6 sm:px-10 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white text-base sm:text-lg font-semibold shadow-xl shadow-primary/30 transition-all transform hover:scale-[1.02] hover:-translate-y-1 touch-target"
              >
                Start Your Free Journey
                <span className="material-symbols-outlined text-lg sm:text-xl group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </Link>
              <Link
                href="/counsellors"
                className="inline-flex items-center justify-center gap-2 rounded-2xl h-14 sm:h-16 px-6 sm:px-8 bg-white dark:bg-gray-800 text-text-primary dark:text-white text-base sm:text-lg font-semibold border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-all transform hover:scale-[1.02] touch-target"
              >
                <span className="material-symbols-outlined text-emerald-500 text-lg sm:text-xl">
                  support_agent
                </span>
                Talk to a Counsellor
              </Link>
            </div>

            <p className="mt-6 sm:mt-8 text-xs sm:text-sm text-text-secondary dark:text-gray-500 flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-green-500 text-base sm:text-lg">
                  check_circle
                </span>
                100% Free
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-green-500 text-base sm:text-lg">
                  check_circle
                </span>
                No Ads
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-green-500 text-base sm:text-lg">
                  check_circle
                </span>
                Private & Secure
              </span>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

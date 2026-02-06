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
          className="relative min-h-[90vh] flex items-center scroll-mt-20"
        >
          {/* Soft organic background */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-50/80 via-white to-white dark:from-purple-950/20 dark:via-background-dark dark:to-background-dark" />

          {/* Decorative shapes */}
          <div className="absolute top-20 right-[10%] w-72 h-72 bg-purple-200/40 dark:bg-purple-900/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-[5%] w-96 h-96 bg-pink-100/50 dark:bg-pink-900/10 rounded-full blur-3xl" />

          <div className="relative w-full px-6 lg:px-20 py-20">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col lg:flex-row items-center gap-16">
                {/* Left Content */}
                <div className="flex-1 text-center lg:text-left">
                  <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-4">
                    Women&apos;s Health Companion
                  </p>

                  <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold leading-tight text-text-primary dark:text-white mb-6">
                    Take charge of your
                    <span className="block text-primary mt-1">
                      menstrual health
                    </span>
                  </h1>

                  <p className="text-lg text-text-secondary dark:text-gray-400 max-w-lg mx-auto lg:mx-0 mb-10 leading-relaxed">
                    A free, private period tracker designed for women in Uganda.
                    Track your cycle, log symptoms, and chat with an AI health
                    companion who understands you.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <Link
                      href="/auth/signup"
                      className="inline-flex items-center justify-center gap-2 rounded-xl h-14 px-8 bg-primary hover:bg-primary/90 text-white text-base font-semibold shadow-lg shadow-primary/25 transition-all"
                    >
                      Start tracking — it&apos;s free
                      <span className="material-symbols-outlined text-xl">
                        arrow_forward
                      </span>
                    </Link>
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center justify-center gap-2 rounded-xl h-14 px-8 bg-white dark:bg-gray-800 text-text-primary dark:text-white text-base font-semibold border border-gray-200 dark:border-gray-700 hover:border-primary transition-all"
                    >
                      Sign in
                    </Link>
                  </div>

                  <p className="mt-6 text-sm text-text-secondary dark:text-gray-500">
                    No credit card required. Your data stays private.
                  </p>
                </div>

                {/* Right - App Preview Card */}
                <div className="flex-1 w-full max-w-md">
                  <div className="relative">
                    {/* Main card */}
                    <div className="bg-white dark:bg-card-dark rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-800">
                      {/* Calendar header */}
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <p className="text-sm text-text-secondary dark:text-gray-400">
                            Today
                          </p>
                          <p className="text-2xl font-bold text-text-primary dark:text-white">
                            February 5
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary text-2xl">
                            calendar_today
                          </span>
                        </div>
                      </div>

                      {/* Cycle info */}
                      <div className="bg-gradient-to-r from-primary/5 to-pink-50 dark:from-primary/10 dark:to-pink-900/10 rounded-2xl p-5 mb-5">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="material-symbols-outlined text-primary">
                            cycle
                          </span>
                          <span className="font-semibold text-text-primary dark:text-white">
                            Cycle Day 12
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full w-2/5 bg-gradient-to-r from-primary to-pink-400 rounded-full" />
                        </div>
                        <p className="text-sm text-text-secondary dark:text-gray-400 mt-2">
                          Your next period may start around Feb 18
                        </p>
                      </div>

                      {/* Quick actions */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
                          <span className="material-symbols-outlined text-pink-500 text-xl mb-1">
                            edit_note
                          </span>
                          <p className="text-sm font-medium text-text-primary dark:text-white">
                            Log today
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
                          <span className="material-symbols-outlined text-purple-500 text-xl mb-1">
                            chat_bubble
                          </span>
                          <p className="text-sm font-medium text-text-primary dark:text-white">
                            Ask Sister
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Floating badge */}
                    <div className="absolute -bottom-4 -right-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2 shadow-lg">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-600 text-lg">
                          lock
                        </span>
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          Private & secure
                        </span>
                      </div>
                    </div>
                  </div>
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

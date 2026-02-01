import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <Header variant="landing" />

      <main className="flex-1">
        {/* Hero Section */}
        <div className="px-6 lg:px-40 py-12 md:py-20 flex justify-center">
          <div className="max-w-[1200px] w-full">
            <div className="flex flex-col gap-10 lg:flex-row items-center">
              <div className="w-full lg:w-1/2 flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                  <span className="text-primary font-bold tracking-widest uppercase text-xs">
                    Empowering Every Woman
                  </span>
                  <h1 className="text-4xl md:text-6xl font-black leading-[1.1] tracking-tight">
                    Your companion for every cycle
                  </h1>
                  <p className="text-base md:text-lg font-normal text-text-secondary max-w-[500px]">
                    SisterCare provides menstrual health tracking and emotional
                    support with dignity and privacy. Join a community that
                    understands you.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/auth/signup"
                    className="flex min-w-[180px] items-center justify-center rounded-xl h-14 px-6 bg-primary text-white text-lg font-bold shadow-primary-lg hover:scale-[1.02] transition-transform"
                  >
                    Start Your Journey
                  </Link>
                  <button className="flex items-center gap-2 text-primary font-bold px-6 h-14 hover:underline">
                    <span className="material-symbols-outlined">
                      play_circle
                    </span>
                    See how it works
                  </button>
                </div>
                <div className="flex items-center gap-4 pt-4">
                  <div className="flex -space-x-3">
                    <div className="h-10 w-10 rounded-full border-2 border-white bg-gradient-to-br from-purple-400 to-pink-400" />
                    <div className="h-10 w-10 rounded-full border-2 border-white bg-gradient-to-br from-pink-400 to-orange-300" />
                    <div className="h-10 w-10 rounded-full border-2 border-white bg-gradient-to-br from-purple-500 to-blue-400" />
                  </div>
                  <p className="text-sm font-medium text-text-secondary">
                    Join 10k+ sisters today
                  </p>
                </div>
              </div>

              <div className="w-full lg:w-1/2">
                <div className="relative aspect-square md:aspect-video lg:aspect-square w-full rounded-3xl overflow-hidden bg-gradient-to-tr from-primary/10 to-purple-100 dark:from-primary/20 dark:to-purple-900/30">
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="bg-white/90 dark:bg-card-dark/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/50 w-full max-w-[320px]">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg">Your Cycle</h3>
                        <span className="text-primary material-symbols-outlined">
                          calendar_today
                        </span>
                      </div>
                      <div className="space-y-4">
                        <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-primary w-2/3" />
                        </div>
                        <p className="text-sm font-medium text-text-secondary">
                          Phase: Follicular • Day 12
                        </p>
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                          <p className="text-xs text-text-secondary uppercase font-bold mb-2">
                            Daily Insight
                          </p>
                          <p className="text-sm italic">
                            &quot;Focus on creative projects today. Your energy
                            levels are peaking.&quot;
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div
          id="features"
          className="px-6 lg:px-40 py-20 bg-white dark:bg-card-dark"
        >
          <div className="max-w-[1200px] mx-auto">
            <div className="flex flex-col gap-12">
              <div className="flex flex-col gap-4 text-center items-center">
                <h2 className="text-3xl md:text-4xl font-black tracking-tight max-w-[720px]">
                  Designed for your well-being
                </h2>
                <p className="text-text-secondary text-lg max-w-[720px]">
                  We offer tools that prioritize your health, privacy, and
                  emotional balance at every stage.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex flex-col gap-5 rounded-2xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-8 hover:shadow-lg transition-shadow">
                  <div className="text-primary bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">
                      calendar_month
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-bold">Cycle Tracking</h3>
                    <p className="text-text-secondary leading-relaxed">
                      Understand your body with intuitive cycle monitoring and
                      predictive insights tailored to you.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-5 rounded-2xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-8 hover:shadow-lg transition-shadow">
                  <div className="text-primary bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">
                      favorite
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-bold">Emotional Support</h3>
                    <p className="text-text-secondary leading-relaxed">
                      Connect with mental health resources and a moderated
                      community that shares your journey.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-5 rounded-2xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-8 hover:shadow-lg transition-shadow">
                  <div className="text-primary bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">
                      verified_user
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-bold">Absolute Privacy</h3>
                    <p className="text-text-secondary leading-relaxed">
                      Your health data is your own. We use end-to-end encryption
                      to ensure your privacy is never compromised.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="px-6 lg:px-40 py-20">
          <div className="max-w-[1200px] mx-auto bg-primary rounded-[2.5rem] p-10 md:p-20 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -ml-32 -mb-32" />
            </div>
            <div className="relative z-10 flex flex-col items-center gap-8">
              <h2 className="text-3xl md:text-5xl font-black text-white leading-tight max-w-[800px]">
                Ready to embrace your cycle with confidence?
              </h2>
              <p className="text-white/80 text-lg md:text-xl max-w-[600px]">
                Join thousands of women who have found comfort, clarity, and
                community with SisterCare.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <Link
                  href="/auth/signup"
                  className="bg-white text-primary px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors shadow-xl"
                >
                  Get Started Now
                </Link>
                <Link
                  href="/auth/login"
                  className="bg-primary/20 text-white border border-white/30 px-10 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-colors"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer variant="landing" />
    </div>
  );
}

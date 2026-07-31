"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";

const LANGUAGES = [
  "Luganda",
  "Swahili",
  "Runyankole",
  "Acholi",
  "Ateso",
  "Lugbara",
  "Luo",
  "English",
];

const FEATURES = [
  {
    icon: "chat_bubble",
    title: "A private first conversation",
    text: "Ask the question that feels too difficult to say aloud. Sister responds respectfully and helps you choose a safe next step.",
  },
  {
    icon: "support_agent",
    title: "Verified human support",
    text: "Request a private conversation with an eligible counsellor without exposing your identity to them by default.",
  },
  {
    icon: "psychology",
    title: "Emotional wellbeing",
    text: "Record mood, stress, sleep, and energy without streaks or judgment, then decide what you want to discuss.",
  },
  {
    icon: "calendar_month",
    title: "Menstrual support",
    text: "Track periods and symptoms privately, understand changes, and know when a concern deserves professional attention.",
  },
];

const STEPS = [
  {
    icon: "person_add",
    title: "Create a private account",
    text: "Begin with the minimum information needed to protect your access. Optional health setup can wait.",
  },
  {
    icon: "tune",
    title: "Choose what feels comfortable",
    text: "Set your language, notification privacy, and what you want SisterCare to remember or share.",
  },
  {
    icon: "forum",
    title: "Talk or track",
    text: "Ask Sister privately, request a verified counsellor, or record your menstrual and emotional wellbeing.",
  },
];

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
      <Header variant="landing" />

      <main className="flex-1">
        {/* ============ HERO ============ */}
        <section
          id="mission"
          className="scroll-mt-20 border-b border-border-light pt-safe dark:border-border-dark"
        >
          <div className="mx-auto grid max-w-container items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:px-20 lg:py-28">
            {/* Narrative */}
            <div className="text-center lg:text-left">
              <h1 className="page-title mb-6 dark:text-white">
                A private place to ask what feels hard to say.
              </h1>

              <p className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-text-secondary dark:text-gray-400 sm:text-xl lg:mx-0">
                SisterCare helps girls and women speak freely about
                menstruation, emotional wellbeing, relationships, and other
                sensitive concerns without shame. Talk privately, track what
                matters, or reach a verified counsellor.
              </p>

              <div className="mb-10 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  href="/auth/signup"
                  className="touch-target inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-white shadow-primary-sm transition-colors hover:bg-primary-dark"
                >
                  Create your account
                  <span className="material-symbols-outlined text-xl">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  href="/auth/login"
                  className="touch-target inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border-light bg-white px-6 font-semibold text-text-primary transition-colors hover:border-primary/30 hover:text-primary dark:border-border-dark dark:bg-card-dark dark:text-white"
                >
                  Sign In
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-text-secondary dark:text-gray-400 lg:justify-start">
                {["No judgment", "Member-controlled privacy", "Verified care"].map(
                  (item) => (
                    <span key={item} className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-lg text-success">
                        check_circle
                      </span>
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* Product visualization — pure CSS chat mockup */}
            <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:ml-auto">
              <div className="relative rounded-2xl border border-border-light bg-white p-5 shadow-soft-lg dark:border-border-dark dark:bg-card-dark">
                {/* Mock header */}
                <div className="mb-4 flex items-center gap-3 border-b border-border-light pb-4 dark:border-border-dark">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg text-white">
                    💜
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary dark:text-white">
                      Sister
                    </p>
                    <p className="flex items-center gap-1 text-xs text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />
                      Private support space
                    </p>
                  </div>
                  <span className="material-symbols-outlined ml-auto text-text-secondary/60">
                    mic
                  </span>
                </div>

                {/* Mock conversation */}
                <div className="space-y-3">
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-user-bubble px-4 py-2.5 text-sm text-text-primary">
                    Sister, nfunye obulumi mu lubuto...
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-primary/5 px-4 py-2.5 text-sm text-text-primary dark:bg-primary/15 dark:text-gray-200">
                    Nkuwulira. I&apos;m sorry you&apos;re hurting. How severe
                    is the pain, and do you have heavy bleeding, faintness, or
                    vomiting? We can work out a safe next step together.
                  </div>
                  {/* Cycle insight card */}
                  <div className="flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 p-3 dark:bg-primary/10">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <span className="material-symbols-outlined text-lg text-primary">
                        calendar_month
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary dark:text-white">
                        Period expected in 2 days
                      </p>
                      <p className="text-2xs text-text-secondary dark:text-gray-400">
                        Reminder set · Luteal phase, day 26 of 28
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating language chips */}
              <span className="hidden">
                Luganda
              </span>
              <span className="hidden">
                Swahili
              </span>
              <span className="hidden">
                Acholi 🎙️
              </span>
            </div>
          </div>
        </section>

        {/* ============ STAT BAND ============ */}
        <section className="border-b border-border-light bg-white dark:border-border-dark dark:bg-card-dark">
          <div className="mx-auto grid max-w-container grid-cols-2 gap-6 px-4 py-8 text-center sm:px-6 md:grid-cols-4 lg:px-20">
            {[
              ["Private", "first conversations"],
              ["Human", "support when requested"],
              ["Voice + text", "ways to communicate"],
              ["Verified", "counsellor network"],
            ].map(([big, small]) => (
              <div key={small}>
                <p className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">
                  {big}
                </p>
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  {small}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ FEATURES ============ */}
        <section
          id="features"
          className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 lg:px-20 lg:py-24"
        >
          <div className="mx-auto max-w-container">
            <div className="mb-12 text-center lg:mb-16">
              <h2 className="section-title mb-4 dark:text-white">
                Support built around difficult conversations
              </h2>
              <p className="mx-auto max-w-xl text-lg text-text-secondary dark:text-gray-400">
                Start with what you need today. SisterCare keeps conversation,
                menstrual support, emotional wellbeing, and human care
                connected without making you disclose more than necessary.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-border-light bg-white p-6 shadow-soft transition-shadow duration-200 hover:shadow-soft-lg dark:border-border-dark dark:bg-card-dark"
                >
                  <div
                    className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"
                  >
                    <span className="material-symbols-outlined text-2xl">
                      {f.icon}
                    </span>
                  </div>
                  <h3 className="mb-2 font-bold text-text-primary dark:text-white">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-text-secondary dark:text-gray-400">
                    {f.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ VOICE & LANGUAGES ============ */}
        <section className="border-y border-border-light bg-white px-4 py-16 dark:border-border-dark dark:bg-card-dark sm:px-6 sm:py-20 lg:px-20">
          <div className="mx-auto grid max-w-container items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary dark:bg-primary/10">
                <span className="material-symbols-outlined text-sm">mic</span>
                Voice first
              </span>
              <h2 className="section-title mb-4 dark:text-white">
                Speak to Sister in{" "}
                <span className="text-primary">your own language</span>
              </h2>
              <p className="mb-6 text-lg leading-relaxed text-text-secondary dark:text-gray-400">
                Type, speak, or use both. SisterCare is being built to
                understand local language and code-switching so a sensitive
                question does not have to be translated into unfamiliar words
                before it can be heard.
              </p>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <span
                    key={lang}
                    className="rounded-full border border-border-light bg-white px-4 py-1.5 text-sm font-medium text-text-primary shadow-soft dark:border-border-dark dark:bg-card-dark dark:text-gray-200"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>

            {/* Voice visual */}
            <div className="mx-auto w-full max-w-sm">
              <div className="rounded-2xl border border-border-light bg-white p-6 shadow-soft-lg dark:border-border-dark dark:bg-card-dark">
                <div className="mb-5 flex items-center justify-center gap-1">
                  {[10, 22, 14, 30, 18, 34, 12, 26, 16, 24, 10].map((h, i) => (
                    <span
                      key={i}
                      className="w-1.5 rounded-full bg-primary/75"
                      style={{ height: `${h * 2}px` }}
                    />
                  ))}
                </div>
                <p className="text-center text-sm font-medium text-text-primary dark:text-white">
                  &ldquo;Sister, mbulira ku nsonga z&apos;obulamu bwange&rdquo;
                </p>
                <p className="mt-1 text-center text-xs text-text-secondary dark:text-gray-400">
                  Voice note · Luganda · understood ✓
                </p>
                <div className="mt-5 flex items-center justify-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-primary-sm">
                    <span className="material-symbols-outlined">mic</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ PRIVACY ============ */}
        <section
          id="privacy"
          className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 lg:px-20 lg:py-24"
        >
          <div className="mx-auto max-w-container">
            <div className="rounded-2xl bg-primary p-8 text-center text-white sm:p-12 lg:p-16">
              <div>
                <span className="material-symbols-outlined mb-6 text-5xl opacity-90">
                  lock
                </span>
                <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
                  Your Privacy is Sacred
                </h2>
                <p className="mx-auto mb-8 max-w-xl text-lg text-white/80">
                  Sensitive support requires honest privacy controls.
                  SisterCare limits collection, does not sell health data or
                  use it for advertising, and gives you clear choices about
                  retention, sharing, export, and deletion.
                </p>
                <div className="flex flex-wrap justify-center gap-3 text-sm">
                  {[
                    ["verified", "Private by design"],
                    ["block", "Never sold"],
                    ["visibility_off", "Minimum access"],
                    ["delete_forever", "Deletion controls"],
                  ].map(([icon, label]) => (
                    <span
                      key={label}
                      className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {icon}
                      </span>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ HOW IT WORKS ============ */}
        <section className="bg-background-light px-4 py-16 dark:bg-background-dark sm:px-6 sm:py-20 lg:px-20 lg:py-24">
          <div className="mx-auto max-w-content">
            <div className="mb-12 text-center">
              <h2 className="section-title mb-3 dark:text-white">
                Get Started in 3 Steps
              </h2>
              <p className="text-lg text-text-secondary dark:text-gray-400">
                From alone to supported, in under two minutes.
              </p>
            </div>

            <div className="relative space-y-8">
              {/* Connector line */}
              <div className="absolute bottom-8 left-6 top-8 hidden w-px bg-border-light sm:block dark:bg-border-dark" />

              {STEPS.map((step, i) => (
                <div key={step.title} className="relative flex items-start gap-5">
                  <div className="z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-white text-primary shadow-soft dark:bg-card-dark">
                    <span className="material-symbols-outlined">
                      {step.icon}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border-light bg-white p-5 shadow-soft dark:border-border-dark dark:bg-card-dark">
                    <p className="mb-1 text-2xs font-bold uppercase tracking-widest text-primary">
                      Step {i + 1}
                    </p>
                    <h3 className="mb-1 font-bold text-text-primary dark:text-white">
                      {step.title}
                    </h3>
                    <p className="text-sm text-text-secondary dark:text-gray-400">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ ALWAYS-THERE STRIP ============ */}
        <section className="px-4 py-10 sm:px-6 lg:px-20">
          <div className="mx-auto flex max-w-content flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-800 dark:bg-emerald-900/20 sm:flex-row sm:text-left">
            <span className="material-symbols-outlined text-3xl text-emerald-600 dark:text-emerald-400">
              health_and_safety
            </span>
            <p className="text-sm leading-relaxed text-emerald-900 dark:text-emerald-200">
              <span className="font-semibold">
                If you&apos;re ever in danger or crisis,
              </span>{" "}
              SisterCare shows validated support options for your configured
              region and helps you request an eligible counsellor. It will
              never hide a technical failure or promise that help has been
              contacted before the service confirms it.
            </p>
          </div>
        </section>

        {/* ============ FINAL CTA ============ */}
        <section className="safe-bottom px-4 py-16 sm:px-6 sm:py-20 lg:px-20 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="section-title mb-4 dark:text-white">
              You Deserve Support
            </h2>
            <p className="mb-8 text-lg text-text-secondary dark:text-gray-400">
              No more silence. No more facing it alone. Your sister is waiting.
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/auth/signup"
                className="touch-target inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-white shadow-primary-sm transition-colors hover:bg-primary-dark"
              >
                Start Free
                <span className="material-symbols-outlined text-xl">
                  arrow_forward
                </span>
              </Link>
              <Link
                href="/counsellors"
                className="touch-target inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border-light bg-white px-6 font-semibold text-text-primary transition-colors hover:border-primary/30 hover:text-primary dark:border-border-dark dark:bg-card-dark dark:text-white"
              >
                <span className="material-symbols-outlined text-xl text-emerald-500">
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

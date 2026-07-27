import PublicPageShell from "@/components/layout/PublicPageShell";

const FEATURES = [
  {
    icon: "calendar_month",
    title: "Know your cycle",
    text: "Track periods and symptoms, understand patterns, and receive timely reminders.",
  },
  {
    icon: "forum",
    title: "Ask without judgement",
    text: "Talk privately with Sister for educational guidance grounded in your context.",
  },
  {
    icon: "menu_book",
    title: "Learn with confidence",
    text: "Explore practical health information designed to be clear and culturally useful.",
  },
  {
    icon: "support_agent",
    title: "Reach a real person",
    text: "Connect with verified counsellors when a conversation needs human care.",
  },
];

export default function AboutPage() {
  return (
    <PublicPageShell
      eyebrow="Why we exist"
      title="Care should feel safe, clear and close to home."
      description="SisterCare helps women and girls understand their bodies, find trustworthy guidance, and reach human support in one private space."
    >
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
        <section>
          <h2 className="text-2xl font-bold text-text-primary dark:text-white">
            Built around dignity
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-text-secondary dark:text-gray-300 sm:text-base">
            <p>
              Menstrual and emotional health questions are still difficult to
              ask in many communities. Confusion should never become shame, and
              distance should never make support unreachable.
            </p>
            <p>
              We combine private health tracking, responsible AI guidance and
              verified counsellor access so each person can choose the kind of
              support that feels right for them.
            </p>
          </div>
          <div className="mt-7 rounded-[20px] border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/30">
            <p className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-200">
              <span className="material-symbols-outlined">verified_user</span>
              Your information remains yours
            </p>
            <p className="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-300">
              Review, export or delete your data from your account controls.
              SisterCare does not sell personal health information.
            </p>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="surface p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-primary/10 text-primary">
                <span className="material-symbols-outlined">{feature.icon}</span>
              </span>
              <h3 className="mt-5 text-lg font-bold text-text-primary dark:text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary dark:text-gray-300">
                {feature.text}
              </p>
            </article>
          ))}
        </section>
      </div>
    </PublicPageShell>
  );
}

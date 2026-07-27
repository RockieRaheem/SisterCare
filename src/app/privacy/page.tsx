import PublicPageShell from "@/components/layout/PublicPageShell";

const SECTIONS = [
  {
    title: "Information you choose to share",
    body: "This can include your account details, menstrual cycle data, symptoms, preferences, conversation context and health-related notes. We also collect limited operational data needed to keep the service secure and reliable.",
  },
  {
    title: "How SisterCare uses it",
    body: "We use your information to provide cycle predictions, personalize relevant guidance, perform actions you request, deliver opted-in reminders, connect you with counsellors and improve service safety.",
  },
  {
    title: "Security and responsible processing",
    body: "Access is restricted by authenticated identity and server-side authorization. Sensitive actions are audited, and personal health information is not sold or used for third-party advertising.",
  },
  {
    title: "Your controls",
    body: "You may review and correct your profile, export your information, change notification preferences or request complete account deletion from Settings.",
  },
];

export default function PrivacyPage() {
  return (
    <PublicPageShell
      eyebrow="Privacy"
      title="Your health information belongs to you."
      description="This overview explains what SisterCare processes, why it is needed, and the controls available to you."
    >
      <div className="grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-14">
        <aside>
          <div className="surface sticky top-24 p-5">
            <span className="material-symbols-outlined text-2xl text-primary">
              shield_lock
            </span>
            <p className="mt-3 font-bold text-text-primary dark:text-white">
              Privacy summary
            </p>
            <p className="mt-2 text-xs leading-5 text-text-secondary dark:text-gray-400">
              Updated 27 July 2026
            </p>
          </div>
        </aside>
        <div className="space-y-8">
          {SECTIONS.map((section, index) => (
            <section key={section.title} className="border-b border-border-light pb-8 last:border-0 dark:border-border-dark">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-2 text-xl font-bold text-text-primary dark:text-white">
                {section.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary dark:text-gray-300 sm:text-base">
                {section.body}
              </p>
            </section>
          ))}
          <section className="surface p-6">
            <h2 className="font-bold text-text-primary dark:text-white">
              Questions or privacy requests
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary dark:text-gray-300">
              Contact{" "}
              <a className="font-semibold text-primary hover:underline" href="mailto:privacy@sistercare.app">
                privacy@sistercare.app
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </PublicPageShell>
  );
}

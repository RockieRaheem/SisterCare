import Link from "next/link";
import PublicPageShell from "@/components/layout/PublicPageShell";

const FAQS = [
  {
    q: "How does cycle prediction work?",
    a: "SisterCare uses the period dates and typical cycle length you provide to estimate future dates. Predictions are estimates and can change when your cycle changes.",
  },
  {
    q: "Is my health information private?",
    a: "Access is tied to your authenticated account. You can review, export or delete your information from Settings, and personal health information is not sold for advertising.",
  },
  {
    q: "How do I update my period?",
    a: "Tell Sister that your period started, or use the cycle controls on your dashboard. Sister confirms updates after they are saved.",
  },
  {
    q: "Can I speak to a person?",
    a: "Yes. Open Counsellors to view verified professionals or ask Sister to request a counsellor session for you.",
  },
  {
    q: "Is Sister's guidance medical advice?",
    a: "No. Sister offers supportive health education and helps you navigate the product. A qualified healthcare professional should assess medical concerns.",
  },
];

export default function HelpPage() {
  return (
    <PublicPageShell
      eyebrow="Help centre"
      title="Find an answer or reach someone who can help."
      description="Start with common questions, continue with Sister, or connect with a verified counsellor."
    >
      <section className="mb-10 grid gap-4 sm:grid-cols-3">
        {[
          ["forum", "Ask Sister", "Private guidance, any time", "/chat"],
          ["support_agent", "Find a counsellor", "Verified human support", "/counsellors"],
          ["menu_book", "Browse the library", "Practical health education", "/library"],
        ].map(([icon, title, text, href]) => (
          <Link key={title} href={href} className="surface group p-5 transition hover:-translate-y-0.5 hover:border-primary/30">
            <span className="material-symbols-outlined text-2xl text-primary">{icon}</span>
            <h2 className="mt-4 font-bold text-text-primary group-hover:text-primary dark:text-white">{title}</h2>
            <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">{text}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
        <section>
          <h2 className="text-2xl font-bold text-text-primary dark:text-white">
            Common questions
          </h2>
          <div className="mt-5 space-y-3">
            {FAQS.map((faq) => (
              <details key={faq.q} className="surface group overflow-hidden">
                <summary className="flex min-h-16 list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-text-primary dark:text-white">
                  {faq.q}
                  <span className="material-symbols-outlined shrink-0 text-primary transition-transform group-open:rotate-180">
                    expand_more
                  </span>
                </summary>
                <p className="border-t border-border-light px-5 py-4 text-sm leading-6 text-text-secondary dark:border-border-dark dark:text-gray-300">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[20px] border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950/30">
            <span className="material-symbols-outlined text-red-700 dark:text-red-300">
              emergency
            </span>
            <h2 className="mt-3 font-bold text-red-900 dark:text-red-200">
              Urgent support
            </h2>
            <p className="mt-2 text-sm leading-6 text-red-800 dark:text-red-300">
              Call Sauti 116 or Uganda emergency services on 999 or 112 when
              immediate help is needed.
            </p>
          </div>
          <div className="surface p-5">
            <h2 className="font-bold text-text-primary dark:text-white">
              Product support
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary dark:text-gray-300">
              For account or technical help, email{" "}
              <a className="font-semibold text-primary hover:underline" href="mailto:support@sistercare.app">
                support@sistercare.app
              </a>
              .
            </p>
          </div>
          <Link href="/report" className="surface group flex items-start gap-3 p-5 transition hover:border-primary/30">
            <span className="material-symbols-outlined text-primary" aria-hidden="true">report</span>
            <span><span className="block font-bold text-text-primary group-hover:text-primary dark:text-white">Report a concern</span><span className="mt-1 block text-sm leading-6 text-text-secondary dark:text-gray-300">Privately report unsafe advice, conduct, privacy or access problems.</span></span>
          </Link>
        </aside>
      </div>
    </PublicPageShell>
  );
}

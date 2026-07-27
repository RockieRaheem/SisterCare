import PublicPageShell from "@/components/layout/PublicPageShell";

const TERMS = [
  {
    title: "Using SisterCare",
    body: "By creating an account or using the service, you agree to use SisterCare lawfully, provide information you believe is accurate, and protect your account credentials.",
  },
  {
    title: "Health information, not diagnosis",
    body: "SisterCare provides educational guidance and tracking support. It does not diagnose conditions or replace a qualified healthcare professional. Seek urgent local help when you may be in immediate danger.",
  },
  {
    title: "Responsible use",
    body: "Do not misuse the service, attempt to access another person's information, interfere with availability, impersonate a counsellor or use the platform to cause harm.",
  },
  {
    title: "Availability and changes",
    body: "We work to keep SisterCare reliable, but internet access and external services can fail. Features may change as we improve safety, performance and user experience.",
  },
  {
    title: "Account controls",
    body: "You may stop using SisterCare and request deletion of your account. Some limited records may be retained where required for security, legal obligations or incident investigation.",
  },
];

export default function TermsPage() {
  return (
    <PublicPageShell
      eyebrow="Terms of service"
      title="Clear expectations, written for people."
      description="These terms describe how SisterCare should be used and where its responsibilities begin and end."
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 flex flex-col gap-4 rounded-[20px] border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30 sm:flex-row">
          <span className="material-symbols-outlined text-amber-700 dark:text-amber-300">
            medical_information
          </span>
          <p className="text-sm leading-6 text-amber-900 dark:text-amber-200">
            <strong>Important:</strong> SisterCare is not an emergency response
            service or substitute for professional medical care.
          </p>
        </div>
        <div className="space-y-9">
          {TERMS.map((term, index) => (
            <section key={term.title} className="grid gap-3 sm:grid-cols-[48px_1fr]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                {index + 1}
              </span>
              <div>
                <h2 className="text-xl font-bold text-text-primary dark:text-white">
                  {term.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-text-secondary dark:text-gray-300 sm:text-base">
                  {term.body}
                </p>
              </div>
            </section>
          ))}
        </div>
        <div className="surface mt-12 p-6">
          <p className="font-bold text-text-primary dark:text-white">
            Need clarification?
          </p>
          <p className="mt-2 text-sm text-text-secondary dark:text-gray-300">
            Email{" "}
            <a className="font-semibold text-primary hover:underline" href="mailto:support@sistercare.app">
              support@sistercare.app
            </a>
            . Updated 27 July 2026.
          </p>
        </div>
      </div>
    </PublicPageShell>
  );
}

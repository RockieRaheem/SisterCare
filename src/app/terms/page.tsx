import PublicPageShell from "@/components/layout/PublicPageShell";

const TERMS = [
  { title: "Controlled pilot and age", body: "This version is a limited product pilot for people aged 18 or older. By joining, you confirm that you meet this age requirement and understand that features, availability and pilot rules may change as safety findings are addressed." },
  { title: "Support, not emergency or medical care", body: "SisterCare provides private wellbeing support, educational information, cycle tracking and access to verified counsellors. Sister is an AI assistant. It cannot diagnose, prescribe treatment, guarantee that advice is correct or replace a qualified health professional. Do not use SisterCare for an emergency." },
  { title: "Urgent situations", body: "If you or someone else may be in immediate danger in Uganda, call emergency services on 999 or 112. Sauti 116 supports child-protection and gender-based violence concerns. SisterCare may show urgent resources or recommend human help, but it does not continuously monitor every conversation and cannot dispatch emergency services." },
  { title: "Private counsellor support", body: "Counsellor verification reduces risk but does not promise a particular outcome. A request is not accepted until the assigned counsellor confirms it. Availability can change. Keep communication inside the private care room, do not share unnecessary identifying details, and report conduct that feels unsafe or inappropriate." },
  { title: "Your account and information", body: "Provide information you believe is accurate, protect your password and sign out on shared devices. You control whether new assistant conversations remain in your account or are session-only. How SisterCare processes information is explained in the pilot Privacy Notice." },
  { title: "Responsible use", body: "Do not access another person's account, impersonate a counsellor, harass another person, upload unlawful material, probe private systems, overwhelm the service or use SisterCare to cause harm. We may restrict access while investigating credible safety, security or abuse concerns." },
  { title: "Reporting and review", body: "Members can privately report an AI response, counsellor, session, message, privacy concern or access failure. Reports are reviewed by authorised administrators. A report form is not urgent care, and submitting one does not guarantee a specific outcome." },
  { title: "Availability and external services", body: "Internet access, AI providers, authentication, speech and audio-call services can fail or be unavailable. We work to recover safely, but we do not promise uninterrupted access. Written support may remain available when speech or audio does not." },
  { title: "Ending participation", body: "You may stop participating, delete eligible information and request account deletion from Settings. Limited audit, report or safety records may be retained where necessary for incident investigation, legal obligations or protection of the service, as described in the Privacy Notice." },
];

export default function TermsPage() {
  return (
    <PublicPageShell eyebrow="Controlled pilot terms" title="Clear expectations for a safer pilot." description="These terms explain what SisterCare can provide, what it cannot provide and how every participant should use the service.">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 flex flex-col gap-4 rounded-[20px] border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30 sm:flex-row"><span className="material-symbols-outlined text-red-700 dark:text-red-300" aria-hidden="true">medical_information</span><p className="text-sm leading-6 text-red-950 dark:text-red-100"><strong>Important:</strong> SisterCare is not an emergency response service, a medical device or a substitute for professional diagnosis and treatment.</p></div>
        <div className="space-y-9">{TERMS.map((term, index) => <section key={term.title} className="grid gap-3 sm:grid-cols-[48px_1fr]"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{index + 1}</span><div><h2 className="text-xl font-bold text-text-primary dark:text-white">{term.title}</h2><p className="mt-2 text-sm leading-7 text-text-secondary dark:text-gray-300 sm:text-base">{term.body}</p></div></section>)}</div>
        <div className="surface mt-12 p-6"><p className="font-bold text-text-primary dark:text-white">Questions about these pilot terms?</p><p className="mt-2 text-sm leading-6 text-text-secondary dark:text-gray-300">Email <a className="font-semibold text-primary hover:underline" href="mailto:support@sistercare.app">support@sistercare.app</a>. Effective 19 August 2026.</p></div>
      </div>
    </PublicPageShell>
  );
}

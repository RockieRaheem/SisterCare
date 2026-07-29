import Link from "next/link";
import CounsellorShell from "@/components/counsellor/CounsellorShell";
import { SUPPORT_CONTACTS } from "@/lib/supportContacts";

const options = [
  {
    icon: "phone_in_talk",
    title: "Call operations",
    description:
      "Speak with SisterCare operations about access, KYC, or an urgent account issue.",
    label: `Call ${SUPPORT_CONTACTS.phone}`,
    href: SUPPORT_CONTACTS.callUrl,
    external: false,
  },
  {
    icon: "chat",
    title: "WhatsApp operations",
    description:
      "Open a pre-filled private message to the SisterCare operations contact.",
    label: "Open WhatsApp",
    href: SUPPORT_CONTACTS.whatsappUrl,
    external: true,
  },
  {
    icon: "mail",
    title: "Email operations",
    description:
      "Send your account email, application issue, and preferred callback time.",
    label: SUPPORT_CONTACTS.email,
    href: SUPPORT_CONTACTS.emailUrl,
    external: false,
  },
] as const;

export default function CounsellorSupportPage() {
  return (
    <CounsellorShell>
      <div className="mx-auto max-w-4xl">
        <Link
          href="/counsellor"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to care desk
        </Link>
        <span className="eyebrow mt-6 block">Counsellor operations</span>
        <h1 className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white">
          Get professional account support
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
          Contact the operations team about KYC feedback, account access,
          availability, session assignments, or article review. Do not include
          member health information in support messages.
        </p>

        <section className="mt-7 grid gap-4 md:grid-cols-3">
          {options.map((option) => (
            <a
              key={option.title}
              href={option.href}
              target={option.external ? "_blank" : undefined}
              rel={option.external ? "noreferrer" : undefined}
              className="group flex min-h-64 flex-col rounded-3xl border border-violet-100 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30 dark:border-gray-700 dark:bg-card-dark"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined">
                  {option.icon}
                </span>
              </span>
              <h2 className="mt-5 font-bold text-gray-900 dark:text-white">
                {option.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                {option.description}
              </p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                {option.label}
                <span className="material-symbols-outlined text-lg">
                  arrow_forward
                </span>
              </span>
            </a>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <h2 className="font-bold">For a faster KYC response</h2>
          <p className="mt-2 text-sm leading-6">
            Include the email used for your counsellor account, the review
            feedback shown in your portal, and whether you have already
            resubmitted corrected documents.
          </p>
        </section>
      </div>
    </CounsellorShell>
  );
}

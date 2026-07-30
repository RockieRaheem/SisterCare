import Link from "next/link";
import CounsellorShell from "@/components/counsellor/CounsellorShell";
import {
  OperationsNotice,
  OperationsPageHeader,
} from "@/components/operations/OperationsUI";
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
      <div className="mx-auto max-w-5xl">
        <OperationsPageHeader
          eyebrow="Counsellor operations"
          title="Professional support"
          description="Get help with KYC, account access, availability, session routing or editorial review. Choose the channel that matches the urgency of your issue."
          actions={
            <Link href="/counsellor" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-[#1b1922] dark:text-slate-200">
              <span className="material-symbols-outlined text-xl" aria-hidden="true">arrow_back</span>
              Care desk
            </Link>
          }
        />

        <div className="mb-6">
          <OperationsNotice tone="warning" title="Protect member confidentiality">
            Never include a member’s name, contact information, health details or session transcript in an operations support message.
          </OperationsNotice>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          {options.map((option) => (
            <a
              key={option.title}
              href={option.href}
              target={option.external ? "_blank" : undefined}
              rel={option.external ? "noreferrer" : undefined}
              className="group flex min-h-64 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft-lg dark:border-slate-800 dark:bg-[#1b1922]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
                <span className="material-symbols-outlined" aria-hidden="true">
                  {option.icon}
                </span>
              </span>
              <h2 className="mt-5 font-extrabold text-slate-950 dark:text-white">
                {option.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {option.description}
              </p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-primary">
                {option.label}
                <span className="material-symbols-outlined text-lg transition group-hover:translate-x-0.5" aria-hidden="true">
                  arrow_forward
                </span>
              </span>
            </a>
          ))}
        </section>

        <section className="mt-6 grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#1b1922] sm:grid-cols-[auto_1fr]">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <span className="material-symbols-outlined" aria-hidden="true">checklist</span>
          </span>
          <div>
            <h2 className="font-extrabold text-slate-950 dark:text-white">Help us resolve the issue quickly</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Include the email used for your professional account, the exact error shown in the portal, when it happened and your preferred callback time. For KYC questions, include the review feedback—but never resend credential files through WhatsApp or email unless operations provides an approved secure channel.
            </p>
          </div>
        </section>
      </div>
    </CounsellorShell>
  );
}

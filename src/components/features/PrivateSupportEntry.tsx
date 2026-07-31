import Link from "next/link";

export const PRIVATE_SUPPORT_ACTIONS = [
  {
    href: "/chat",
    icon: "chat_bubble",
    label: "Ask Sister privately",
    description: "Start a new conversation",
    primary: true,
  },
  {
    href: "/sessions",
    icon: "support_agent",
    label: "Talk to a counsellor",
    description: "Request verified human support",
    primary: false,
  },
] as const;

export default function PrivateSupportEntry() {
  return (
    <section
      aria-labelledby="private-support-heading"
      className="mb-6 overflow-hidden rounded-2xl border border-primary/15 bg-white shadow-soft dark:border-primary/25 dark:bg-card-dark sm:mb-8"
    >
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="max-w-2xl">
          <span className="eyebrow">Private support</span>
          <h2
            id="private-support-heading"
            className="mt-2 text-2xl font-bold tracking-tight text-text-primary dark:text-white"
          >
            What feels difficult to say today?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary dark:text-gray-300 sm:text-base">
            Begin with Sister or request a verified human counsellor. You do
            not need to complete cycle setup before asking for support.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[410px]">
          {PRIVATE_SUPPORT_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`group flex min-h-16 items-center gap-3 rounded-xl border px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                action.primary
                  ? "border-primary bg-primary text-white hover:bg-primary-dark"
                  : "border-border-light bg-background-light text-text-primary hover:border-primary/30 hover:bg-primary/5 dark:border-border-dark dark:bg-background-dark dark:text-white"
              }`}
            >
              <span
                className="material-symbols-outlined text-2xl"
                aria-hidden="true"
              >
                {action.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{action.label}</span>
                <span
                  className={`block text-xs ${
                    action.primary
                      ? "text-white/80"
                      : "text-text-secondary dark:text-gray-400"
                  }`}
                >
                  {action.description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";

export function OperationsPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-slate-950 dark:text-white sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

const tones = {
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  primary: "bg-primary/10 text-primary dark:bg-primary/15",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  danger: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  info: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
} as const;

export function OperationsStat({
  label,
  value,
  icon,
  tone = "neutral",
  helper,
}: {
  label: string;
  value: React.ReactNode;
  icon: string;
  tone?: keyof typeof tones;
  helper?: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#1b1922]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-[-0.04em] text-slate-950 dark:text-white">
            {value}
          </p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <span className="material-symbols-outlined text-xl" aria-hidden="true">
            {icon}
          </span>
        </span>
      </div>
      {helper && <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{helper}</p>}
    </article>
  );
}

export function OperationsNotice({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const icon = {
    info: "info",
    success: "check_circle",
    warning: "warning",
    danger: "error",
  }[tone];
  const border = {
    info: "border-sky-200 bg-sky-50/70 text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100",
    success: "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
    warning: "border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100",
    danger: "border-red-200 bg-red-50/70 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100",
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`flex items-start gap-3 rounded-2xl border p-4 ${border}`}>
      <span className="material-symbols-outlined mt-0.5 text-xl" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-sm leading-6">
        {title && <p className="font-bold">{title}</p>}
        <div className={title ? "mt-0.5 opacity-85" : ""}>{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  dot?: boolean;
}) {
  return (
    <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function OperationsEmptyState({
  icon,
  title,
  description,
  href,
  actionLabel,
}: {
  icon: string;
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center dark:border-slate-700 dark:bg-[#1b1922]">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
      </span>
      <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      {href && actionLabel && (
        <Link href={href} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-white">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function OperationsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading" role="status">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1b1922]">
          <div className="h-4 w-2/5 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-3 h-3 w-4/5 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="mt-2 h-3 w-3/5 rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      ))}
      <span className="sr-only">Loading workspace data</span>
    </div>
  );
}

import Link from "next/link";

export default function PublicPageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app-page">
      <header className="safe-top sticky top-0 z-40 border-b border-border-light bg-white/95 backdrop-blur dark:border-border-dark dark:bg-card-dark/95">
        <div className="page-container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-primary">
            <span
              className="material-symbols-outlined text-2xl"
              style={{ fontVariationSettings: '"FILL" 1, "wght" 600' }}
            >
              favorite
            </span>
            <span className="font-extrabold tracking-[-0.03em] text-text-primary dark:text-white">
              SisterCare
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-primary/5 hover:text-primary dark:text-gray-300"
          >
            <span className="material-symbols-outlined text-lg">
              arrow_back
            </span>
            <span className="hidden sm:inline">Back to home</span>
          </Link>
        </div>
      </header>

      <main className="safe-bottom">
        <section className="border-b border-border-light bg-background-light dark:border-border-dark dark:bg-background-dark">
          <div className="page-container py-12 sm:py-16">
            <span className="eyebrow">{eyebrow}</span>
            <h1 className="page-title mt-3 max-w-3xl dark:text-white">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary dark:text-gray-300 sm:text-lg">
              {description}
            </p>
          </div>
        </section>
        <div className="page-container py-10 sm:py-14">{children}</div>
      </main>
    </div>
  );
}

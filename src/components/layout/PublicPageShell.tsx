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
      <header className="safe-top sticky top-0 z-40 border-b border-border-light/70 bg-white/86 backdrop-blur-xl dark:border-border-dark dark:bg-card-dark/86">
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
        <section className="border-b border-border-light/70 bg-gradient-to-b from-primary/[0.07] to-transparent dark:border-border-dark">
          <div className="page-container py-12 sm:py-16">
            <span className="eyebrow">{eyebrow}</span>
            <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight text-text-primary dark:text-white sm:text-5xl">
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

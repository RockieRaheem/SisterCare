"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";

interface PublishedArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  authorName: string;
  authorTitle: string;
  reviewedAt: string;
  publishedAt: string;
}

const CATEGORIES = [
  { id: "all", label: "All reviewed guidance" },
  { id: "comfort", label: "Comfort & hygiene" },
  { id: "emotional", label: "Emotional wellbeing" },
  { id: "medical", label: "When to seek care" },
  { id: "nutrition", label: "Food & nutrition" },
];

export default function LibraryPage() {
  const searchParams = useSearchParams();
  const [articles, setArticles] = useState<PublishedArticle[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [expanded, setExpanded] = useState<string | null>(
    searchParams.get("article"),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/library/articles")
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "The library could not be loaded.");
        }
        setArticles(payload.data.articles || []);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "The library could not be loaded.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const article = searchParams.get("article");
    const query = searchParams.get("search");
    if (article) setExpanded(article);
    if (query) setSearch(query);
  }, [searchParams]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return articles.filter((article) => {
      const categoryMatches =
        activeCategory === "all" || article.category === activeCategory;
      const queryMatches =
        !query ||
        `${article.title} ${article.description} ${article.tags.join(" ")}`
          .toLowerCase()
          .includes(query);
      return categoryMatches && queryMatches;
    });
  }, [activeCategory, articles, search]);

  return (
    <div className="app-page min-h-screen">
      <Header variant="app" />
      <main id="main-content" className="page-container pb-28 pt-6 md:pb-12 md:pt-10">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <span className="eyebrow">Reviewed guidance</span>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-text-primary dark:text-white sm:text-4xl">
              Practical answers you can verify
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary dark:text-gray-400">
              Every item here was written by a verified counsellor and approved
              through SisterCare&apos;s clinical editorial review before publication.
            </p>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
            <aside>
              <label htmlFor="library-category" className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Topic
              </label>
              <select
                id="library-category"
                value={activeCategory}
                onChange={(event) => setActiveCategory(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-border-light bg-white px-3 text-sm font-semibold dark:border-border-dark dark:bg-card-dark"
              >
                {CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </select>
              <div className="mt-4 rounded-2xl bg-primary/5 p-4 text-sm leading-6 text-text-secondary dark:text-gray-300">
                Need help applying something you read?
                <Link href="/chat" className="mt-2 block font-bold text-primary">
                  Ask Sister privately
                </Link>
              </div>
            </aside>

            <section>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden="true">search</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search reviewed guidance"
                  className="min-h-12 w-full rounded-2xl border border-border-light bg-white pl-12 pr-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-border-dark dark:bg-card-dark"
                />
              </div>

              {loading ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2" aria-label="Loading reviewed guidance">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="h-52 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
                  ))}
                </div>
              ) : error ? (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
                  {error}
                </div>
              ) : filtered.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-border-light p-8 text-center dark:border-border-dark">
                  <span className="material-symbols-outlined text-3xl text-text-secondary" aria-hidden="true">verified</span>
                  <h2 className="mt-3 font-black text-text-primary dark:text-white">No reviewed guidance matches yet</h2>
                  <p className="mt-2 text-sm leading-6 text-text-secondary dark:text-gray-400">
                    SisterCare will not fill this space with unreviewed advice. Try another topic or ask a counsellor.
                  </p>
                  <Link href="/counsellors" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-white">
                    Find human support
                  </Link>
                </div>
              ) : (
                <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
                  {filtered.map((article) => {
                    const isOpen = expanded === article.id;
                    return (
                      <article
                        key={article.id}
                        id={`article-${article.id}`}
                        className={`rounded-2xl border border-border-light bg-white p-5 shadow-soft dark:border-border-dark dark:bg-card-dark ${isOpen ? "md:col-span-2" : ""}`}
                      >
                        <div className="flex items-center gap-2 text-xs font-bold text-primary">
                          <span className="material-symbols-outlined text-base" aria-hidden="true">verified</span>
                          Clinically reviewed
                        </div>
                        <h2 className="mt-3 text-lg font-black text-text-primary dark:text-white">{article.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-text-secondary dark:text-gray-400">{article.description}</p>
                        <p className="mt-3 text-xs text-text-secondary dark:text-gray-500">
                          By {article.authorName}, {article.authorTitle} · Reviewed {new Date(article.reviewedAt).toLocaleDateString()}
                        </p>
                        {isOpen && (
                          <div className="mt-5 whitespace-pre-line border-t border-border-light pt-5 text-sm leading-7 text-text-primary dark:border-border-dark dark:text-gray-200">
                            {article.content}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : article.id)}
                          className="mt-5 min-h-11 rounded-xl border border-primary/25 px-4 text-sm font-bold text-primary transition hover:bg-primary/5"
                        >
                          {isOpen ? "Close guidance" : "Read reviewed guidance"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

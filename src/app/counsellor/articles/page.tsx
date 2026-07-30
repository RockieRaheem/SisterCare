"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import CounsellorShell from "@/components/counsellor/CounsellorShell";
import {
  OperationsEmptyState,
  OperationsNotice,
  OperationsPageHeader,
  OperationsSkeleton,
  StatusBadge,
} from "@/components/operations/OperationsUI";
import { auth } from "@/lib/authClient";
import { readApiResponse } from "@/lib/apiResponse";

type ArticleStatus = "pending_review" | "published" | "rejected";
type Article = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status: ArticleStatus;
  submittedAt?: string;
  updatedAt?: string;
};
type ApiResult<T> = {
  success?: boolean;
  data?: T;
  error?: string;
};
type ArticleForm = {
  title: string;
  description: string;
  content: string;
  categoryId: string;
  tags: string;
  coverImageUrl: string;
};

const DRAFT_KEY = "sc_counsellor_article_draft";
const EMPTY_FORM: ArticleForm = {
  title: "",
  description: "",
  content: "",
  categoryId: "comfort",
  tags: "",
  coverImageUrl: "",
};
const categories = [
  { id: "comfort", label: "Comfort & hygiene" },
  { id: "emotional", label: "Emotional well-being" },
  { id: "medical", label: "When to seek care" },
  { id: "nutrition", label: "Nutrition & diet" },
];

async function api(path: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Your secure session expired. Sign in again.");
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
}

function statusMeta(status: ArticleStatus) {
  if (status === "published") return { label: "Published", tone: "success" as const, icon: "public" };
  if (status === "rejected") return { label: "Changes required", tone: "danger" as const, icon: "rate_review" };
  return { label: "In clinical review", tone: "warning" as const, icon: "hourglass_top" };
}

export default function CounsellorArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draftSaved, setDraftSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [form, setForm] = useState<ArticleForm>(EMPTY_FORM);

  const load = useCallback(async () => {
    try {
      const response = await api("/api/counsellor/articles");
      const result = await readApiResponse<ApiResult<{ articles?: Article[] }>>(response);
      if (!response.ok) throw new Error(result.error || "Could not load your submissions");
      setArticles(result.data?.articles || []);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load your submissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (saved) setForm({ ...EMPTY_FORM, ...(JSON.parse(saved) as Partial<ArticleForm>) });
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, [load]);

  useEffect(() => {
    if (form === EMPTY_FORM) return;
    const timer = window.setTimeout(() => {
      const hasDraft = Object.entries(form).some(
        ([key, value]) => key !== "categoryId" && value.trim().length > 0,
      );
      if (hasDraft) {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
        setDraftSaved(true);
      } else {
        window.localStorage.removeItem(DRAFT_KEY);
        setDraftSaved(false);
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [form]);

  const update = <K extends keyof ArticleForm>(key: K, value: ArticleForm[K]) => {
    setDraftSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await api("/api/counsellor/articles", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        }),
      });
      const result = await readApiResponse<ApiResult<{ id?: string }>>(response);
      if (!response.ok) throw new Error(result.error || "Could not submit this article");
      setForm(EMPTY_FORM);
      window.localStorage.removeItem(DRAFT_KEY);
      setDraftSaved(false);
      setShowPreview(false);
      setNotice("Article submitted. It will remain private until clinical editorial review is complete.");
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit this article");
    } finally {
      setSaving(false);
    }
  };

  const wordCount = useMemo(
    () => form.content.trim().split(/\s+/).filter(Boolean).length,
    [form.content],
  );
  const statusCounts = useMemo(
    () => ({
      pending_review: articles.filter((article) => article.status === "pending_review").length,
      published: articles.filter((article) => article.status === "published").length,
      rejected: articles.filter((article) => article.status === "rejected").length,
    }),
    [articles],
  );
  const canPreview = form.title.trim() && form.description.trim() && form.content.trim();

  return (
    <CounsellorShell>
      <OperationsPageHeader
        eyebrow="Knowledge studio"
        title="Clinical library contributions"
        description="Create clear, evidence-informed guidance for members. Every submission remains private until an administrator completes editorial review."
        actions={
          <button
            type="button"
            onClick={() => setShowPreview((current) => !current)}
            disabled={!canPreview}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-[#1b1922] dark:text-slate-200"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">preview</span>
            {showPreview ? "Close preview" : "Preview article"}
          </button>
        }
      />

      {error && <div className="mb-5"><OperationsNotice tone="danger" title="Knowledge studio unavailable">{error}</OperationsNotice></div>}
      {notice && <div className="mb-5"><OperationsNotice tone="success" title="Submitted for review">{notice}</OperationsNotice></div>}

      <section className="mb-6 grid gap-3 sm:grid-cols-3" aria-label="Submission summary">
        {[
          ["In review", statusCounts.pending_review, "hourglass_top", "text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300"],
          ["Published", statusCounts.published, "public", "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300"],
          ["Changes required", statusCounts.rejected, "rate_review", "text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-300"],
        ].map(([label, value, icon, tone]) => (
          <article key={String(label)} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1b1922]">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
              <span className="material-symbols-outlined text-xl" aria-hidden="true">{icon}</span>
            </span>
            <div>
              <p className="text-2xl font-extrabold tabular-nums text-slate-950 dark:text-white">{value}</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          </article>
        ))}
      </section>

      {showPreview && (
        <section className="mb-6 rounded-3xl border border-primary/20 bg-white p-6 shadow-soft dark:border-primary/30 dark:bg-[#1b1922]" aria-labelledby="article-preview-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">Private preview</p>
              <h2 id="article-preview-heading" className="mt-1 text-xl font-extrabold text-slate-950 dark:text-white">{form.title}</h2>
            </div>
            <StatusBadge tone="neutral">{categories.find((category) => category.id === form.categoryId)?.label}</StatusBadge>
          </div>
          <p className="mt-5 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">{form.description}</p>
          <div className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-300">{form.content}</div>
          {form.tags.trim() && (
            <div className="mt-6 flex flex-wrap gap-2">
              {form.tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 8).map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{tag}</span>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-[#1b1922] sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">New article</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Write for clarity, safety and practical usefulness.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <span className="material-symbols-outlined text-base" aria-hidden="true">{draftSaved ? "cloud_done" : "edit"}</span>
              {draftSaved ? "Draft saved on this device" : "Editing draft"}
            </span>
          </div>
          <form onSubmit={submit} className="mt-6 space-y-5">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
              Article title
              <input required maxLength={140} value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="A specific, useful title" className="mt-2 min-h-12 w-full rounded-xl border-slate-300 bg-white text-base dark:border-slate-700 dark:bg-slate-900" />
              <span className="mt-1 block text-right text-[11px] font-medium text-slate-400">{form.title.length}/140</span>
            </label>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
              Member-facing summary
              <textarea required maxLength={360} rows={3} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Explain what the reader will learn and why it matters." className="mt-2 w-full resize-y rounded-xl border-slate-300 bg-white text-base dark:border-slate-700 dark:bg-slate-900" />
              <span className="mt-1 block text-right text-[11px] font-medium text-slate-400">{form.description.length}/360</span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Category
                <select value={form.categoryId} onChange={(event) => update("categoryId", event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border-slate-300 bg-white text-base dark:border-slate-700 dark:bg-slate-900">
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                </select>
              </label>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Search tags
                <input value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="Nutrition, self-care" className="mt-2 min-h-12 w-full rounded-xl border-slate-300 bg-white text-base dark:border-slate-700 dark:bg-slate-900" />
              </label>
            </div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
              Cover image URL <span className="font-medium text-slate-400">(optional)</span>
              <input type="url" value={form.coverImageUrl} onChange={(event) => update("coverImageUrl", event.target.value)} placeholder="https://…" className="mt-2 min-h-12 w-full rounded-xl border-slate-300 bg-white text-base dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
              Article content
              <textarea required minLength={120} rows={18} value={form.content} onChange={(event) => update("content", event.target.value)} placeholder="Use short sections, plain language and clear next steps. Explain when a member should seek professional care." className="mt-2 w-full resize-y rounded-xl border-slate-300 bg-white text-base leading-7 dark:border-slate-700 dark:bg-slate-900" />
              <span className="mt-1 flex justify-between text-[11px] font-medium text-slate-400">
                <span>Minimum 120 characters</span>
                <span>{wordCount} words · {form.content.length}/12,000</span>
              </span>
            </label>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Before submitting</p>
              <ul className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                <li className="flex gap-2"><span className="material-symbols-outlined text-lg text-emerald-600" aria-hidden="true">check</span>No member-identifying information</li>
                <li className="flex gap-2"><span className="material-symbols-outlined text-lg text-emerald-600" aria-hidden="true">check</span>Clear limits and escalation advice</li>
                <li className="flex gap-2"><span className="material-symbols-outlined text-lg text-emerald-600" aria-hidden="true">check</span>Evidence-informed language</li>
                <li className="flex gap-2"><span className="material-symbols-outlined text-lg text-emerald-600" aria-hidden="true">check</span>No diagnosis or personal prescription</li>
              </ul>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  setForm(EMPTY_FORM);
                  window.localStorage.removeItem(DRAFT_KEY);
                  setDraftSaved(false);
                }}
                className="min-h-11 rounded-xl px-4 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                Clear draft
              </button>
              <button disabled={saving} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50">
                <span className="material-symbols-outlined text-xl" aria-hidden="true">send</span>
                {saving ? "Submitting securely…" : "Submit for clinical review"}
              </button>
            </div>
          </form>
        </section>

        <aside>
          <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1b1922]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-extrabold text-slate-950 dark:text-white">Your submissions</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Most recently updated first</p>
              </div>
              <button type="button" onClick={() => void load()} aria-label="Refresh submissions" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
              </button>
            </div>
            <div className="mt-5">
              {loading ? (
                <OperationsSkeleton rows={3} />
              ) : articles.length ? (
                <div className="space-y-3">
                  {articles.map((article) => {
                    const status = statusMeta(article.status);
                    return (
                      <article key={article.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                            <span className="material-symbols-outlined text-lg" aria-hidden="true">{status.icon}</span>
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-2 text-sm font-bold leading-5 text-slate-900 dark:text-white">{article.title}</h3>
                            <div className="mt-2"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></div>
                            {(article.updatedAt || article.submittedAt) && <p className="mt-2 text-[11px] text-slate-400">Updated {new Date(article.updatedAt || article.submittedAt || "").toLocaleDateString()}</p>}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <OperationsEmptyState icon="draft" title="No submissions yet" description="Submitted articles and their editorial status will appear here." />
              )}
            </div>
          </div>
        </aside>
      </div>
    </CounsellorShell>
  );
}

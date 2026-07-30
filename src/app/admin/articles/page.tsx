"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import {
  OperationsEmptyState,
  OperationsNotice,
  OperationsPageHeader,
  OperationsSkeleton,
  OperationsStat,
  StatusBadge,
} from "@/components/operations/OperationsUI";
import { auth } from "@/lib/authClient";
import { readApiResponse } from "@/lib/apiResponse";

type Article = {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  authorName: string;
  authorTitle: string;
  submittedAt?: string;
};
type ApiResult<T> = { success?: boolean; data?: T; error?: string };
type ReviewCheck = "scope" | "safety" | "privacy" | "clarity";

const checks: Array<{ id: ReviewCheck; title: string; description: string }> = [
  { id: "scope", title: "Clinically appropriate scope", description: "The article educates without diagnosing or prescribing individual treatment." },
  { id: "safety", title: "Safety and escalation", description: "Warning signs and when to seek professional or emergency care are clear." },
  { id: "privacy", title: "Privacy and dignity", description: "There is no member-identifying information or demeaning language." },
  { id: "clarity", title: "Clear and supportable", description: "Claims are understandable, internally consistent and suitable for publication." },
];

async function api(path: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Your secure session expired. Sign in again.");
  return fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers },
  });
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState("");
  const [attestations, setAttestations] = useState<Set<ReviewCheck>>(new Set());

  const load = useCallback(async () => {
    try {
      const response = await api("/api/admin/articles");
      const result = await readApiResponse<ApiResult<{ articles: Article[] }>>(response);
      if (!response.ok) throw new Error(result.error || "Could not load the review queue");
      const queue = result.data?.articles || [];
      setArticles(queue);
      setActiveId((current) => current && queue.some((article) => article.id === current) ? current : queue[0]?.id || "");
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load the review queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setAttestations(new Set());
  }, [activeId]);

  const active = useMemo(() => articles.find((article) => article.id === activeId) || null, [activeId, articles]);
  const allChecked = checks.every((check) => attestations.has(check.id));

  const review = async (article: Article, decision: "publish" | "reject") => {
    if (decision === "publish" && !allChecked) {
      setError("Complete every review check before publishing.");
      return;
    }
    setBusy(article.id);
    setError("");
    setNotice("");
    try {
      const response = await api("/api/admin/articles", {
        method: "PATCH",
        body: JSON.stringify({ articleId: article.id, decision, attestations: Array.from(attestations) }),
      });
      const result = await readApiResponse<ApiResult<Record<string, never>>>(response);
      if (!response.ok) throw new Error(result.error || "Review decision failed");
      setNotice(decision === "publish" ? `"${article.title}" is now published to the member library.` : `"${article.title}" was removed from the publication queue.`);
      await load();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Review decision failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <AdminShell>
      <OperationsPageHeader
        eyebrow="Clinical editorial review"
        title="Library publication queue"
        description="Review professional submissions against explicit scope, safety, privacy and clarity standards before any member can see them."
        actions={
          <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white dark:bg-white dark:text-slate-950"><span className="material-symbols-outlined text-xl" aria-hidden="true">refresh</span>Refresh queue</button>
        }
      />

      {error && <div className="mb-5"><OperationsNotice tone="danger" title="Editorial workflow needs attention">{error}</OperationsNotice></div>}
      {notice && <div className="mb-5"><OperationsNotice tone="success" title="Review recorded">{notice}</OperationsNotice></div>}

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <OperationsStat label="Awaiting review" value={articles.length} icon="rate_review" tone={articles.length ? "warning" : "success"} helper="Private, unpublished submissions" />
        <OperationsStat label="Current checklist" value={`${attestations.size}/${checks.length}`} icon="fact_check" tone={allChecked ? "success" : "neutral"} helper="Checks completed for selected article" />
        <OperationsStat label="Publication control" value="Admin" icon="lock" tone="primary" helper="Every decision is server-authorised and audited" />
      </section>

      {loading ? (
        <OperationsSkeleton rows={4} />
      ) : articles.length && active ? (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#1b1922]">
            <div className="px-2 pb-3 pt-2">
              <h2 className="text-sm font-extrabold text-slate-950 dark:text-white">Review queue</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Select one submission at a time.</p>
            </div>
            <div className="space-y-2">
              {articles.map((article, index) => (
                <button key={article.id} type="button" onClick={() => setActiveId(article.id)} aria-pressed={activeId === article.id} className={`w-full rounded-2xl p-4 text-left transition ${activeId === article.id ? "bg-primary text-white shadow-primary-sm" : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[11px] font-bold uppercase tracking-wide ${activeId === article.id ? "text-white/70" : "text-slate-400"}`}>#{index + 1} · {article.category}</span>
                    {article.submittedAt && <span className={`text-[10px] ${activeId === article.id ? "text-white/65" : "text-slate-400"}`}>{new Date(article.submittedAt).toLocaleDateString()}</span>}
                  </div>
                  <span className="mt-2 line-clamp-2 block text-sm font-extrabold leading-5">{article.title}</span>
                  <span className={`mt-2 block truncate text-xs ${activeId === article.id ? "text-white/75" : "text-slate-500 dark:text-slate-400"}`}>{article.authorName}</span>
                </button>
              ))}
            </div>
          </aside>

          <div className="space-y-5">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-[#1b1922] sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5 dark:border-slate-800">
                <div>
                  <StatusBadge tone="primary">{active.category}</StatusBadge>
                  <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.025em] text-slate-950 dark:text-white">{active.title}</h2>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">By <span className="font-bold text-slate-700 dark:text-slate-200">{active.authorName}</span> · {active.authorTitle}</p>
                </div>
                <StatusBadge tone="warning">Private review</StatusBadge>
              </div>
              <p className="mt-6 text-base font-bold leading-7 text-slate-800 dark:text-slate-200">{active.description}</p>
              <div className="mt-6 whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-300">{active.content}</div>
              {active.tags.length > 0 && <div className="mt-6 flex flex-wrap gap-2">{active.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{tag}</span>)}</div>}
            </article>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#1b1922]" aria-labelledby="publication-checklist">
              <div className="flex items-start justify-between gap-3">
                <div><h2 id="publication-checklist" className="font-extrabold text-slate-950 dark:text-white">Publication checklist</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Each confirmation is included in the publication audit event.</p></div>
                <StatusBadge tone={allChecked ? "success" : "neutral"}>{attestations.size}/{checks.length}</StatusBadge>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {checks.map((check) => {
                  const selected = attestations.has(check.id);
                  return (
                    <button key={check.id} type="button" onClick={() => setAttestations((current) => { const next = new Set(current); if (next.has(check.id)) next.delete(check.id); else next.add(check.id); return next; })} aria-pressed={selected} className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${selected ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/25" : "border-slate-200 hover:border-primary/30 dark:border-slate-800"}`}>
                      <span className={`material-symbols-outlined mt-0.5 text-xl ${selected ? "text-emerald-700 dark:text-emerald-300" : "text-slate-400"}`} aria-hidden="true">{selected ? "check_box" : "check_box_outline_blank"}</span>
                      <span><span className="block text-sm font-bold text-slate-900 dark:text-white">{check.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{check.description}</span></span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
                <button type="button" disabled={busy === active.id} onClick={() => void review(active, "reject")} className="min-h-11 rounded-xl border border-red-300 px-5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30">Reject submission</button>
                <button type="button" disabled={busy === active.id || !allChecked} onClick={() => void review(active, "publish")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"><span className="material-symbols-outlined text-xl" aria-hidden="true">publish</span>{busy === active.id ? "Recording decision…" : "Publish to library"}</button>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <OperationsEmptyState icon="library_add_check" title="Publication queue is clear" description="New counsellor submissions will remain private and appear here for review." />
      )}
    </AdminShell>
  );
}

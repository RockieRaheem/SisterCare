"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { OperationsEmptyState, OperationsNotice, OperationsPageHeader, OperationsSkeleton, OperationsStat, StatusBadge } from "@/components/operations/OperationsUI";
import { auth } from "@/lib/authClient";
import { readApiResponse } from "@/lib/apiResponse";

interface ConcernReport {
  id: string;
  reporter_id: string | null;
  target_type: string;
  target_id: string | null;
  category: string;
  description: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  resolution_note: string | null;
  created_at: string;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ConcernReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<"active" | ConcernReport["status"] | "all">("active");
  const [selected, setSelected] = useState<ConcernReport | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const call = async (init?: RequestInit) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Your secure session expired. Sign in again.");
    return fetch("/api/admin/reports", { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
  };
  const load = useCallback(async () => {
    try {
      const response = await call();
      const result = await readApiResponse<{ data?: { reports?: ConcernReport[] }; error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "Reports could not be loaded.");
      setReports(result.data?.reports || []);
      setError("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Reports could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 15_000); return () => clearInterval(timer); }, [load]);

  const transition = async (report: ConcernReport, status: "reviewing" | "resolved" | "dismissed", resolutionNote = "") => {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await call({ method: "PATCH", body: JSON.stringify({ reportId: report.id, status, resolutionNote }) });
      const result = await readApiResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "Report could not be updated.");
      setNotice(status === "reviewing" ? "Review ownership recorded." : "Report closed with an audit note.");
      setSelected(null); setNote(""); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Report could not be updated."); }
    finally { setBusy(false); }
  };

  const visible = useMemo(() => reports.filter((report) => filter === "all" || (filter === "active" ? ["open", "reviewing"].includes(report.status) : report.status === filter)), [filter, reports]);
  const counts = { open: reports.filter((item) => item.status === "open").length, reviewing: reports.filter((item) => item.status === "reviewing").length, resolved: reports.filter((item) => item.status === "resolved").length, privacy: reports.filter((item) => ["open", "reviewing"].includes(item.status) && item.category === "privacy").length };

  return (
    <AdminShell>
      <OperationsPageHeader eyebrow="Member protection" title="Concern reports" description="Review safety, privacy, conduct and access concerns submitted by members. Record ownership before investigating and a clear note before closure." actions={<button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white dark:bg-white dark:text-slate-950"><span className="material-symbols-outlined" aria-hidden="true">refresh</span>Refresh</button>} />
      {error && <div className="mb-5"><OperationsNotice tone="danger" title="Report queue needs attention">{error}</OperationsNotice></div>}
      {notice && <div className="mb-5"><OperationsNotice tone="success" title="Report updated">{notice}</OperationsNotice></div>}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OperationsStat label="Unassigned" value={counts.open} icon="notification_important" tone={counts.open ? "danger" : "success"} helper="New reports needing ownership" />
        <OperationsStat label="Under review" value={counts.reviewing} icon="manage_search" tone={counts.reviewing ? "warning" : "neutral"} helper="Reports with an accountable reviewer" />
        <OperationsStat label="Active privacy" value={counts.privacy} icon="shield_lock" tone={counts.privacy ? "danger" : "neutral"} helper="Privacy concerns still open" />
        <OperationsStat label="Resolved" value={counts.resolved} icon="task_alt" tone="success" helper="Closed with a review record" />
      </section>
      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter concern reports">{(["active", "open", "reviewing", "resolved", "dismissed", "all"] as const).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`min-h-10 rounded-xl px-4 text-sm font-bold capitalize ${filter === value ? "bg-primary text-white" : "border border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-[#1b1922] dark:text-slate-300"}`}>{value}</button>)}</div>
      <section className="mt-4 space-y-3" aria-label="Member concern reports">
        {loading ? <OperationsSkeleton rows={4} /> : visible.length ? visible.map((report) => (
          <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1b1922]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2"><StatusBadge tone={report.status === "open" ? "danger" : report.status === "reviewing" ? "warning" : "success"}>{report.status}</StatusBadge><StatusBadge tone={report.category === "privacy" ? "danger" : "neutral"}>{report.category.replaceAll("_", " ")}</StatusBadge><StatusBadge>{report.target_type.replaceAll("_", " ")}</StatusBadge></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-200">{report.description}</p><p className="mt-3 text-xs text-slate-500">Submitted {new Date(report.created_at).toLocaleString()} · Report {report.id.slice(0, 8)}</p>{report.resolution_note && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300"><span className="font-bold">Closure:</span> {report.resolution_note}</p>}</div><div className="flex shrink-0 flex-wrap gap-2">{report.status === "open" && <button type="button" onClick={() => void transition(report, "reviewing")} disabled={busy} className="min-h-11 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white disabled:opacity-50">Start review</button>}{["open", "reviewing"].includes(report.status) && <button type="button" onClick={() => { setSelected(report); setNote(""); }} className="min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white">Close report</button>}</div></div>
          </article>
        )) : <OperationsEmptyState icon="verified" title="No reports in this view" description="There are no member concern reports matching this filter." />}
      </section>
      {selected && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4"><div role="dialog" aria-modal="true" aria-labelledby="close-report-heading" className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-[#1b1922] sm:rounded-3xl"><h2 id="close-report-heading" className="text-xl font-extrabold text-slate-950 dark:text-white">Close member report</h2><p className="mt-2 text-sm text-slate-500">Record what was reviewed, what action was taken and any follow-up owner. Avoid unnecessary health details.</p><textarea autoFocus value={note} onChange={(event) => setNote(event.target.value)} rows={5} maxLength={2000} className="mt-4 w-full rounded-xl border-slate-300 bg-white text-base dark:border-slate-700 dark:bg-slate-900" placeholder="Review outcome and action taken…" /><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setSelected(null)} className="min-h-11 rounded-xl px-4 text-sm font-bold text-slate-600 dark:text-slate-300">Cancel</button><button type="button" onClick={() => void transition(selected, "dismissed", note)} disabled={note.trim().length < 10 || busy} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">Dismiss with reason</button><button type="button" onClick={() => void transition(selected, "resolved", note)} disabled={note.trim().length < 10 || busy} className="min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50">Resolve</button></div></div></div>}
    </AdminShell>
  );
}

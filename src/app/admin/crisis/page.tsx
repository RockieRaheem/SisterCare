"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import {
  OperationsEmptyState,
  OperationsNotice,
  OperationsPageHeader,
  OperationsSkeleton,
  OperationsStat,
  StatusBadge,
} from "@/components/operations/OperationsUI";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/authClient";
import { readApiResponse } from "@/lib/apiResponse";
import { useAdminAccess } from "@/hooks/useAdminAccess";

interface WaitingRow {
  id: string;
  state: string;
  counsellorName: string | null;
  waitingSeconds: number | null;
}
interface RecentRow {
  id: string;
  state: string;
  requestedAt: string;
  acceptedAt: string | null;
  counsellorName: string | null;
  timeToHumanSeconds: number | null;
}
interface SlaData {
  waiting: WaitingRow[];
  handledCount: number;
  avgSeconds: number | null;
  p90Seconds: number | null;
  maxSeconds: number | null;
  recent: RecentRow[];
}
type ApiResult<T> = { success?: boolean; data?: T; error?: string };
const SLA_TARGET_SECONDS = 600;

function fmtDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function CrisisMonitorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { isAdmin, checking, verificationUnavailable, retry } = useAdminAccess();
  const [data, setData] = useState<SlaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth/login?next=/admin/crisis");
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Your secure session expired. Sign in again.");
      const response = await fetch("/api/admin/sla", { headers: { Authorization: `Bearer ${token}` } });
      const result = await readApiResponse<ApiResult<SlaData>>(response);
      if (!response.ok || !result.data) throw new Error(result.error || "Could not load crisis response data");
      setData(result.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load crisis response data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void load();
    const interval = setInterval(() => void load(), 10_000);
    return () => clearInterval(interval);
  }, [isAdmin, load]);

  if (checking) return <AdminShell><OperationsPageHeader eyebrow="Safety operations" title="Verifying crisis-monitor access" description="Confirming administrator authorization before loading critical response data." /><OperationsSkeleton rows={4} /></AdminShell>;
  if (!isAdmin) return <AdminShell><OperationsEmptyState icon="admin_panel_settings" title="Administrator access required" description="Crisis response monitoring is restricted to authorised administrators." /></AdminShell>;

  const p90Ok = data?.p90Seconds === null || (data?.p90Seconds ?? 0) <= SLA_TARGET_SECONDS;
  const overdue = data?.waiting.filter((row) => (row.waitingSeconds || 0) > SLA_TARGET_SECONDS).length || 0;

  return (
    <AdminShell>
      <OperationsPageHeader
        eyebrow="Safety operations"
        title="Crisis response monitor"
        description="Monitor critical requests from first signal to human acceptance. The operational target is p90 time-to-human below ten minutes."
        actions={
          <>
            <Link href="/admin/incidents" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-[#1b1922] dark:text-slate-200"><span className="material-symbols-outlined text-xl" aria-hidden="true">assignment_late</span>Incidents</Link>
            <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white dark:bg-white dark:text-slate-950"><span className="material-symbols-outlined text-xl" aria-hidden="true">refresh</span>Refresh</button>
          </>
        }
      />

      {error && <div className="mb-5"><OperationsNotice tone="danger" title="Crisis monitoring interrupted">{error}</OperationsNotice></div>}
      {verificationUnavailable && <div className="mb-5"><OperationsNotice tone="warning" action={<button type="button" onClick={() => void retry()} className="min-h-9 rounded-lg border border-current px-3 text-xs font-bold">Retry role check</button>}>Live access verification is temporarily unavailable. Protected requests remain server-authorised.</OperationsNotice></div>}

      {loading ? (
        <OperationsSkeleton rows={5} />
      ) : (
        <>
          <section className={`rounded-3xl border p-6 ${overdue ? "border-red-300 bg-red-50/70 dark:border-red-900 dark:bg-red-950/25" : data?.waiting.length ? "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20" : "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20"}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <StatusBadge tone={overdue ? "danger" : data?.waiting.length ? "warning" : "success"} dot>{overdue ? "SLA breach active" : data?.waiting.length ? "Members waiting" : "Queue clear"}</StatusBadge>
                <h2 className="mt-4 text-xl font-extrabold text-slate-950 dark:text-white">{overdue ? `${overdue} critical request${overdue === 1 ? "" : "s"} exceeded ten minutes` : data?.waiting.length ? `${data.waiting.length} critical request${data.waiting.length === 1 ? "" : "s"} awaiting human care` : "No critical requests are waiting"}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{overdue ? "Confirm accountable human ownership and review the incident queue immediately." : "This monitor refreshes every ten seconds while the workspace is open."}</p>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Not synchronized"}</p>
            </div>
          </section>

          <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OperationsStat label="Waiting now" value={data?.waiting.length || 0} icon="schedule" tone={data?.waiting.length ? "warning" : "success"} helper="Requested or matched critical sessions" />
            <OperationsStat label="p90 to human" value={fmtDuration(data?.p90Seconds ?? null)} icon="speed" tone={p90Ok ? "success" : "danger"} helper="Target below ten minutes" />
            <OperationsStat label="Average response" value={fmtDuration(data?.avgSeconds ?? null)} icon="timer" tone="info" helper="Across handled critical sessions" />
            <OperationsStat label="Handled sample" value={data?.handledCount ?? 0} icon="task_alt" tone="primary" helper="Critical sessions with response timing" />
          </section>

          <section className="mt-7" aria-labelledby="waiting-crisis-heading">
            <div className="mb-4 flex items-end justify-between gap-3"><div><h2 id="waiting-crisis-heading" className="text-lg font-extrabold text-slate-950 dark:text-white">Waiting for a counsellor</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Oldest live critical requests require the fastest operational response.</p></div><StatusBadge tone={overdue ? "danger" : data?.waiting.length ? "warning" : "success"}>{data?.waiting.length || 0}</StatusBadge></div>
            {!data || data.waiting.length === 0 ? (
              <OperationsEmptyState icon="verified" title="No critical request is waiting" description="New critical sessions will appear here with a live time-to-human clock." />
            ) : (
              <div className="space-y-3">
                {data.waiting.slice().sort((a, b) => (b.waitingSeconds || 0) - (a.waitingSeconds || 0)).map((row) => {
                  const isOverdue = (row.waitingSeconds || 0) > SLA_TARGET_SECONDS;
                  return (
                    <article key={row.id} className={`flex flex-col gap-4 rounded-2xl border bg-white p-5 dark:bg-[#1b1922] sm:flex-row sm:items-center sm:justify-between ${isOverdue ? "border-red-300 dark:border-red-900" : "border-amber-200 dark:border-amber-900"}`}>
                      <div><div className="flex flex-wrap items-center gap-2"><StatusBadge tone={isOverdue ? "danger" : "warning"}>{isOverdue ? "Over target" : "Within target"}</StatusBadge><span className="text-xs text-slate-400">Session {row.id.slice(0, 8)}</span></div><p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">{row.state === "matched" ? `Matched to ${row.counsellorName || "a counsellor"} · waiting for acceptance` : "Unmatched · no eligible counsellor has claimed the request"}</p></div>
                      <div className="text-left sm:text-right"><p className={`text-2xl font-extrabold tabular-nums ${isOverdue ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}>{fmtDuration(row.waitingSeconds)}</p><p className="mt-0.5 text-[11px] text-slate-400">time waiting</p></div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </AdminShell>
  );
}

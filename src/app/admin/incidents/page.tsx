"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

interface Incident {
  id: string;
  type: string;
  severity: string;
  status: "open" | "acknowledged" | "resolved";
  sessionId: string;
  waitingSecondsAtOpen: number;
  openedAt: string | null;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  resolutionNote: string;
}
type ApiResult<T> = { success?: boolean; data?: T; error?: string };
type Filter = "active" | "open" | "acknowledged" | "resolved" | "all";

async function callIncidents(init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Your secure session expired. Sign in again.");
  return fetch("/api/admin/incidents", {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
}

function duration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes}m ${seconds % 60}s` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("active");
  const [resolutionTarget, setResolutionTarget] = useState<Incident | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await callIncidents();
      const result = await readApiResponse<ApiResult<{ incidents: Incident[] }>>(response);
      if (!response.ok) throw new Error(result.error || "Could not load incidents");
      setIncidents(result.data?.incidents || []);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load incidents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 15_000);
    return () => clearInterval(timer);
  }, [load]);

  const transition = async (incident: Incident, to: "acknowledged" | "resolved", note = "") => {
    setBusy(incident.id);
    setError("");
    setNotice("");
    try {
      const response = await callIncidents({
        method: "PATCH",
        body: JSON.stringify({ incidentId: incident.id, to, resolutionNote: note }),
      });
      const result = await readApiResponse<ApiResult<Record<string, never>>>(response);
      if (!response.ok) throw new Error(result.error || "Could not update the incident");
      setNotice(to === "acknowledged" ? "Incident ownership recorded." : "Incident resolved with an accountable audit note.");
      setResolutionTarget(null);
      setResolutionNote("");
      await load();
    } catch (transitionError) {
      setError(transitionError instanceof Error ? transitionError.message : "Could not update the incident");
    } finally {
      setBusy(null);
    }
  };

  const filtered = useMemo(
    () => incidents.filter((incident) => filter === "all" || (filter === "active" ? incident.status !== "resolved" : incident.status === filter)),
    [filter, incidents],
  );
  const counts = {
    open: incidents.filter((incident) => incident.status === "open").length,
    acknowledged: incidents.filter((incident) => incident.status === "acknowledged").length,
    resolved: incidents.filter((incident) => incident.status === "resolved").length,
    severe: incidents.filter((incident) => incident.status !== "resolved" && ["critical", "high"].includes(incident.severity)).length,
  };

  return (
    <AdminShell>
      <OperationsPageHeader
        eyebrow="Safety operations"
        title="Incident response"
        description="Take ownership of crisis-response breaches, preserve an accountable decision trail and close incidents only after recording what was done."
        actions={
          <>
            <Link href="/admin/crisis" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-[#1b1922] dark:text-slate-200"><span className="material-symbols-outlined text-xl" aria-hidden="true">emergency</span>Crisis monitor</Link>
            <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white dark:bg-white dark:text-slate-950"><span className="material-symbols-outlined text-xl" aria-hidden="true">refresh</span>Refresh</button>
          </>
        }
      />

      {error && <div className="mb-5"><OperationsNotice tone="danger" title="Incident workflow needs attention">{error}</OperationsNotice></div>}
      {notice && <div className="mb-5"><OperationsNotice tone="success" title="Incident updated">{notice}</OperationsNotice></div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OperationsStat label="Unacknowledged" value={counts.open} icon="notifications_active" tone={counts.open ? "danger" : "success"} helper="Open incidents without ownership" />
        <OperationsStat label="Under response" value={counts.acknowledged} icon="engineering" tone={counts.acknowledged ? "warning" : "neutral"} helper="Acknowledged and awaiting closure" />
        <OperationsStat label="High severity active" value={counts.severe} icon="emergency" tone={counts.severe ? "danger" : "neutral"} helper="Critical or high-severity incidents" />
        <OperationsStat label="Resolved" value={counts.resolved} icon="task_alt" tone="success" helper="Closed with a resolution record" />
      </section>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter incidents">
        {(["active", "open", "acknowledged", "resolved", "all"] as const).map((value) => (
          <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`min-h-10 rounded-xl px-4 text-sm font-bold capitalize ${filter === value ? "bg-primary text-white" : "border border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-[#1b1922] dark:text-slate-300"}`}>{value}</button>
        ))}
      </div>

      <section className="mt-4 space-y-3" aria-label="Incident records">
        {loading ? (
          <OperationsSkeleton rows={4} />
        ) : filtered.length ? filtered.map((incident) => {
          const statusTone = incident.status === "open" ? "danger" : incident.status === "acknowledged" ? "warning" : "success";
          return (
            <article key={incident.id} className={`rounded-2xl border bg-white p-5 dark:bg-[#1b1922] ${incident.status === "open" ? "border-red-300 dark:border-red-900" : "border-slate-200 dark:border-slate-800"}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><StatusBadge tone={statusTone}>{incident.status}</StatusBadge><StatusBadge tone={["critical", "high"].includes(incident.severity) ? "danger" : "warning"}>{incident.severity}</StatusBadge></div>
                  <h2 className="mt-3 font-extrabold text-slate-950 dark:text-white">{incident.type.replaceAll("_", " ")}</h2>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>Session {incident.sessionId.slice(0, 8)}</span>
                    <span>Waiting at open: {duration(incident.waitingSecondsAtOpen)}</span>
                    {incident.openedAt && <span>Opened {new Date(incident.openedAt).toLocaleString()}</span>}
                  </div>
                  {incident.resolutionNote && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:bg-slate-900 dark:text-slate-300"><span className="font-bold">Resolution:</span> {incident.resolutionNote}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  {incident.status === "open" && <button type="button" onClick={() => void transition(incident, "acknowledged")} disabled={busy === incident.id} className="min-h-11 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white disabled:opacity-50">{busy === incident.id ? "Recording…" : "Acknowledge"}</button>}
                  {incident.status === "acknowledged" && <button type="button" onClick={() => { setResolutionTarget(incident); setResolutionNote(""); }} disabled={busy === incident.id} className="min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50">Resolve incident</button>}
                </div>
              </div>
            </article>
          );
        }) : (
          <OperationsEmptyState icon="verified" title="No incidents in this view" description={filter === "active" ? "There are no open or acknowledged incidents." : "Choose another filter to review different incident records."} />
        )}
      </section>

      {resolutionTarget && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 backdrop-blur-[2px] sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="resolve-incident-title" className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-[#1b1922] sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3">
              <div><StatusBadge tone="warning">Accountable closure</StatusBadge><h2 id="resolve-incident-title" className="mt-3 text-xl font-extrabold text-slate-950 dark:text-white">Resolve incident</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Session {resolutionTarget.sessionId.slice(0, 8)}</p></div>
              <button type="button" onClick={() => setResolutionTarget(null)} aria-label="Close resolution dialog" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
            </div>
            <div className="mt-5"><OperationsNotice tone="warning">Record the action taken, the outcome and any required follow-up. Do not include unnecessary member health details.</OperationsNotice></div>
            <label className="mt-5 block text-sm font-bold text-slate-700 dark:text-slate-200">Resolution note<textarea autoFocus required minLength={10} maxLength={1000} rows={5} value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} placeholder="What action was taken, what was the outcome, and who owns any follow-up?" className="mt-2 w-full rounded-xl border-slate-300 bg-white text-base dark:border-slate-700 dark:bg-slate-900" /><span className="mt-1 block text-right text-[11px] text-slate-400">{resolutionNote.length}/1000</span></label>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setResolutionTarget(null)} className="min-h-11 rounded-xl px-4 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button><button type="button" onClick={() => void transition(resolutionTarget, "resolved", resolutionNote.trim())} disabled={resolutionNote.trim().length < 10 || busy === resolutionTarget.id} className="min-h-11 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white disabled:opacity-45">{busy === resolutionTarget.id ? "Closing incident…" : "Confirm resolution"}</button></div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

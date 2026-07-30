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

type MetricDay = Record<string, string | number>;
type ApiResult<T> = { success?: boolean; data?: T; error?: string };
type Health = {
  status: "ready" | "not_ready";
  checks: Record<string, boolean>;
};

const METRIC_LABELS: Record<string, { label: string; icon: string; tone: "neutral" | "primary" | "success" | "warning" | "danger" | "info" }> = {
  api_requests: { label: "API requests", icon: "sync_alt", tone: "info" },
  api_success: { label: "Successful requests", icon: "check_circle", tone: "success" },
  api_errors: { label: "Request errors", icon: "error", tone: "danger" },
  chat_requests: { label: "Chat requests", icon: "forum", tone: "primary" },
  chat_success: { label: "Successful chat responses", icon: "smart_toy", tone: "success" },
  chat_errors: { label: "Chat errors", icon: "sms_failed", tone: "danger" },
  session_requests: { label: "Care requests", icon: "support_agent", tone: "primary" },
  sessions_matched: { label: "Sessions matched", icon: "handshake", tone: "success" },
  crisis_requests: { label: "Crisis requests", icon: "emergency", tone: "warning" },
};

function metricMeta(name: string) {
  return METRIC_LABELS[name] || {
    label: name.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    icon: "monitoring",
    tone: "neutral" as const,
  };
}

function trend(current: number, previous: number | undefined) {
  if (previous === undefined || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export default function OperationsDashboardPage() {
  const [days, setDays] = useState<MetricDay[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Your secure session expired. Sign in again.");
      const [metricsResponse, healthResponse] = await Promise.all([
        fetch("/api/admin/metrics", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/health", { cache: "no-store" }),
      ]);
      const [metricsResult, healthResult] = await Promise.all([
        readApiResponse<ApiResult<{ days: MetricDay[] }>>(metricsResponse),
        readApiResponse<Health>(healthResponse),
      ]);
      if (!metricsResponse.ok) throw new Error(metricsResult.error || "Could not load service metrics");
      setDays(metricsResult.data?.days || []);
      setHealth(healthResult);
      setLastUpdated(new Date());
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load service health");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(true), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const latest = days[0] || {};
  const previous = days[1] || {};
  const metrics = useMemo(
    () => Object.entries(latest).filter(([key, value]) => key !== "date" && typeof value === "number") as Array<[string, number]>,
    [latest],
  );
  const metricNames = useMemo(() => {
    const keys = new Set<string>();
    days.forEach((day) => Object.entries(day).forEach(([key, value]) => {
      if (key !== "date" && typeof value === "number") keys.add(key);
    }));
    return Array.from(keys);
  }, [days]);

  useEffect(() => {
    if (!selectedMetric && metricNames.length) setSelectedMetric(metricNames[0]);
  }, [metricNames, selectedMetric]);

  const series = selectedMetric
    ? days
        .slice()
        .reverse()
        .map((day) => ({ date: String(day.date || ""), value: Number(day[selectedMetric] || 0) }))
    : [];
  const maximum = Math.max(1, ...series.map((point) => point.value));
  const passingChecks = health ? Object.values(health.checks).filter(Boolean).length : 0;
  const totalChecks = health ? Object.keys(health.checks).length : 0;
  const errorsToday = metrics
    .filter(([name]) => name.includes("error") || name.includes("failed"))
    .reduce((sum, [, value]) => sum + value, 0);

  return (
    <AdminShell>
      <OperationsPageHeader
        eyebrow="Service health"
        title="Reliability and outcomes"
        description="Monitor launch readiness, privacy-safe request outcomes and emerging service degradation across the last fourteen days."
        actions={
          <button type="button" onClick={() => void load()} disabled={refreshing} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
            <span className={`material-symbols-outlined text-xl ${refreshing ? "animate-spin" : ""}`} aria-hidden="true">refresh</span>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      {error && <div className="mb-5"><OperationsNotice tone="danger" title="Service health unavailable">{error}</OperationsNotice></div>}

      {loading ? (
        <OperationsSkeleton rows={5} />
      ) : (
        <>
          <section className={`rounded-3xl border p-6 ${health?.status === "ready" ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20" : "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20"}`}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <StatusBadge tone={health?.status === "ready" ? "success" : "warning"} dot>
                  {health?.status === "ready" ? "Production ready" : "Release gate not ready"}
                </StatusBadge>
                <h2 className="mt-4 text-xl font-extrabold text-slate-950 dark:text-white">
                  {health?.status === "ready" ? "All runtime release checks are passing" : `${passingChecks} of ${totalChecks} runtime checks are passing`}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  A failed release check is a deployment signal, not a cosmetic warning. Resolve it before allowing public health guidance.
                </p>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Not synchronized"}</p>
            </div>
            {health && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Object.entries(health.checks).map(([name, passing]) => (
                  <div key={name} className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-[#1b1922]">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${passing ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"}`}>
                      <span className="material-symbols-outlined text-xl" aria-hidden="true">{passing ? "check_circle" : "cancel"}</span>
                    </span>
                    <div>
                      <p className="text-sm font-bold capitalize text-slate-900 dark:text-white">{name.replace(/([A-Z])/g, " $1")}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{passing ? "Passing" : "Needs attention"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OperationsStat label="Tracked metrics today" value={metrics.length} icon="analytics" tone="info" helper={String(latest.date || "No date recorded")} />
            <OperationsStat label="Recorded errors today" value={errorsToday} icon="error" tone={errorsToday ? "danger" : "success"} helper="Across instrumented error counters" />
            <OperationsStat label="History available" value={`${days.length}d`} icon="calendar_month" tone="primary" helper="Daily privacy-safe aggregates" />
            <OperationsStat label="Runtime checks" value={`${passingChecks}/${totalChecks || "—"}`} icon="fact_check" tone={health?.status === "ready" ? "success" : "warning"} helper="Security, database and governance" />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1b1922] sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-extrabold text-slate-950 dark:text-white">Fourteen-day activity</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Daily aggregate trend for the selected signal.</p>
                </div>
                <select value={selectedMetric} onChange={(event) => setSelectedMetric(event.target.value)} className="min-h-11 rounded-xl border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-900">
                  {metricNames.map((name) => <option key={name} value={name}>{metricMeta(name).label}</option>)}
                </select>
              </div>
              {series.length ? (
                <div className="mt-8">
                  <div className="flex h-56 items-end gap-2 border-b border-slate-200 px-1 dark:border-slate-700" aria-label={`${metricMeta(selectedMetric).label} trend`}>
                    {series.map((point) => (
                      <div key={point.date} className="group relative flex h-full min-w-0 flex-1 items-end">
                        <div className="w-full rounded-t-md bg-primary/75 transition hover:bg-primary" style={{ height: `${Math.max(point.value ? 8 : 2, (point.value / maximum) * 100)}%` }} />
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2 py-1 text-[11px] font-bold text-white group-hover:block">{point.date}: {point.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] font-semibold text-slate-400"><span>{series[0]?.date}</span><span>{series[series.length - 1]?.date}</span></div>
                </div>
              ) : (
                <div className="mt-5"><OperationsEmptyState icon="monitoring" title="No trend data yet" description="Daily metrics will appear after instrumented production requests are served." /></div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1b1922] sm:p-6">
              <h2 className="font-extrabold text-slate-950 dark:text-white">Today’s signals</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Compared with the previous recorded day.</p>
              {metrics.length ? (
                <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
                  {metrics.map(([name, value]) => {
                    const meta = metricMeta(name);
                    const change = trend(value, typeof previous[name] === "number" ? Number(previous[name]) : undefined);
                    return (
                      <div key={name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><span className="material-symbols-outlined text-lg" aria-hidden="true">{meta.icon}</span></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-200">{meta.label}</span>{change !== null && <span className={`mt-0.5 block text-[11px] font-semibold ${change > 0 ? "text-sky-600" : change < 0 ? "text-amber-600" : "text-slate-400"}`}>{change > 0 ? "+" : ""}{change}% vs previous day</span>}</span>
                        <span className="text-lg font-extrabold tabular-nums text-slate-950 dark:text-white">{value}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-5 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">No metrics recorded today.</p>
              )}
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}

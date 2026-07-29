"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/authClient";
import { readApiResponse } from "@/lib/apiResponse";

interface WaitingRow {
  id: string;
  state: string;
  counsellorName: string | null;
  waitingSeconds: number | null;
}

interface SlaData {
  waiting: WaitingRow[];
  handledCount: number;
  avgSeconds: number | null;
  p90Seconds: number | null;
  maxSeconds: number | null;
}

const SLA_TARGET_SECONDS = 600; // p90 < 10 minutes (ARCHITECTURE_V2 §6)

function fmtDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ${seconds % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function CrisisMonitorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [data, setData] = useState<SlaData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }
    if (user) {
      auth.currentUser
        ?.getIdTokenResult()
        .then((r) => setIsAdmin(r.claims.role === "admin"))
        .catch(() => setIsAdmin(false));
    }
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/sla", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await readApiResponse<any>(res);
      if (!res.ok || !json.success) throw new Error(json.error);
      setData(json.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [isAdmin, load]);

  if (authLoading || isAdmin === null) {
    return (
      <Shell>
        <p className="py-16 text-center text-gray-400">Loading…</p>
      </Shell>
    );
  }
  if (!isAdmin) {
    return (
      <Shell>
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-card-dark">
          <p className="text-gray-700 dark:text-gray-300">
            Admin access required.
          </p>
        </div>
      </Shell>
    );
  }

  const p90Ok = data?.p90Seconds === null || (data?.p90Seconds ?? 0) <= SLA_TARGET_SECONDS;

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Crisis Monitor
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Time-to-human for critical sessions · target p90 under 10 minutes ·
          refreshes every 10s
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          {error}
        </div>
      )}

      {/* SLA stat tiles */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Waiting now"
          value={String(data?.waiting.length ?? "—")}
          alert={(data?.waiting.length ?? 0) > 0}
        />
        <Stat
          label="p90 to human"
          value={fmtDuration(data?.p90Seconds ?? null)}
          alert={!p90Ok}
        />
        <Stat label="Average" value={fmtDuration(data?.avgSeconds ?? null)} />
        <Stat label="Handled" value={String(data?.handledCount ?? "—")} />
      </div>

      {/* Waiting list */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Waiting for a counsellor
        </h2>
        {!data || data.waiting.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400 dark:border-gray-700 dark:bg-card-dark">
            No one is waiting. 💜
          </div>
        ) : (
          <div className="space-y-2">
            {data.waiting.map((w) => {
              const overdue = (w.waitingSeconds ?? 0) > SLA_TARGET_SECONDS;
              return (
                <div
                  key={w.id}
                  className={`flex items-center justify-between rounded-xl border p-4 ${
                    overdue
                      ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                      : "border-gray-200 bg-white dark:border-gray-700 dark:bg-card-dark"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {w.state === "matched"
                        ? `Matched to ${w.counsellorName || "counsellor"} — awaiting accept`
                        : "Unmatched — no counsellor online"}
                    </p>
                    <p className="text-xs text-gray-500">Session {w.id.slice(0, 8)}</p>
                  </div>
                  <span
                    className={`text-lg font-bold tabular-nums ${
                      overdue ? "text-red-600" : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {fmtDuration(w.waitingSeconds)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </Shell>
  );
}

function Stat({
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        alert
          ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
          : "border-gray-200 bg-white dark:border-gray-700 dark:bg-card-dark"
      }`}
    >
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tabular-nums ${
          alert ? "text-red-600" : "text-gray-900 dark:text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}

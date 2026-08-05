"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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

type Overview = {
  counts: {
    members: number;
    counsellors: number;
    available: number;
    inSession: number;
    pendingKyc: number;
    liveSessions: number;
    waiting: number;
    openIncidents: number;
  };
  applications: Array<{ id: string; name: string; title: string }>;
};
type ApiResult<T> = { success?: boolean; data?: T; error?: string };

async function adminFetch(path: string, init?: RequestInit) {
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

const workspaces = [
  { href: "/admin/counsellors", icon: "verified_user", title: "Care network", description: "Verify credentials, manage shifts and control care capacity.", tone: "bg-primary/10 text-primary" },
  { href: "/admin/crisis", icon: "emergency", title: "Crisis monitor", description: "Protect time-to-human targets for critical requests.", tone: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  { href: "/admin/incidents", icon: "assignment_late", title: "Incident response", description: "Acknowledge, investigate and close safety incidents.", tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  { href: "/admin/operations", icon: "monitoring", title: "Service health", description: "Review reliability signals and request outcomes.", tone: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  { href: "/admin/articles", icon: "edit_note", title: "Clinical review", description: "Review professional content before member publication.", tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
] as const;
const LIVE_REFRESH_MS = 5_000;

function timeLabel(value: Date | null) {
  if (!value) return "Not synchronized";
  return `Updated ${value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function AdminDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { isAdmin, checking, verificationUnavailable, retry } = useAdminAccess();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountRole, setAccountRole] = useState<"admin" | "user">("admin");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showAccess, setShowAccess] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login?next=/admin");
  }, [loading, router, user]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const response = await adminFetch("/api/admin/overview");
      const result = await readApiResponse<ApiResult<Overview>>(response);
      if (!response.ok) throw new Error(result.error || "Could not load the operations overview");
      if (!result.data) throw new Error("The operations overview returned no data");
      setOverview(result.data);
      setLastUpdated(new Date());
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load the operations overview");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void load();
    const refreshVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    const interval = window.setInterval(refreshVisible, LIVE_REFRESH_MS);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [isAdmin, load]);

  const assignRole = async (event: FormEvent) => {
    event.preventDefault();
    const email = accountEmail.trim().toLowerCase();
    if (!email) return;
    if (accountRole === "user" && email === user?.email?.toLowerCase()) {
      setError("You cannot remove your own administrator access from the active session.");
      return;
    }
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await adminFetch("/api/admin/roles", {
        method: "POST",
        body: JSON.stringify({ email, role: accountRole }),
      });
      const result = await readApiResponse<ApiResult<Record<string, never>>>(response);
      if (!response.ok) throw new Error(result.error || "Role assignment failed");
      setNotice(
        accountRole === "admin"
          ? `${email} now has administrator access. They must sign out and sign in again.`
          : `Administrator access was removed from ${email}.`,
      );
      setAccountEmail("");
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : "Role assignment failed");
    } finally {
      setSaving(false);
    }
  };

  const counts = overview?.counts;
  const urgentWork = useMemo(
    () => [
      { label: "KYC reviews", value: counts?.pendingKyc || 0, href: "/admin/counsellors", icon: "verified_user", description: "Professional applications awaiting a decision", tone: "warning" as const },
      { label: "Members waiting", value: counts?.waiting || 0, href: "/admin/crisis", icon: "schedule", description: "Live care requests without human completion", tone: (counts?.waiting || 0) > 0 ? "danger" as const : "neutral" as const },
      { label: "Open incidents", value: counts?.openIncidents || 0, href: "/admin/incidents", icon: "assignment_late", description: "Safety events awaiting accountable closure", tone: (counts?.openIncidents || 0) > 0 ? "danger" as const : "neutral" as const },
    ],
    [counts],
  );
  const urgentTotal = urgentWork.reduce((total, item) => total + item.value, 0);
  const coverageLabel =
    (counts?.available || 0) > 0
      ? `${counts?.available} counsellor${counts?.available === 1 ? "" : "s"} available`
      : "No counsellors available";

  if (checking) {
    return (
      <AdminShell>
        <OperationsPageHeader eyebrow="Secure administration" title="Verifying administrator access" description="Confirming your role before loading protected operations data." />
        <OperationsSkeleton rows={4} />
        {verificationUnavailable && (
          <div className="mt-4"><OperationsNotice tone="warning" action={<button type="button" onClick={() => void retry()} className="min-h-10 rounded-xl border border-current px-4 text-xs font-bold">Retry</button>}>Live role verification is temporarily unavailable.</OperationsNotice></div>
        )}
      </AdminShell>
    );
  }

  if (!isAdmin) {
    return (
      <AdminShell>
        <OperationsEmptyState
          icon="admin_panel_settings"
          title="Administrator access required"
          description="This workspace is restricted to authorised SisterCare administrators."
          href="/admin/setup"
          actionLabel="Activate first administrator"
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <OperationsPageHeader
        eyebrow="Secure administration"
        title="Care operations overview"
        description="Prioritize unresolved work, monitor care coverage and move directly into the operational areas that need attention."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            disabled={refreshing}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950"
          >
            <span className={`material-symbols-outlined text-xl ${refreshing ? "animate-spin" : ""}`} aria-hidden="true">refresh</span>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      {verificationUnavailable && (
        <div className="mb-5">
          <OperationsNotice tone="warning" title="Live role check interrupted" action={<button type="button" onClick={() => void retry()} className="min-h-9 rounded-lg border border-current px-3 text-xs font-bold">Retry</button>}>
            This session was previously verified. Every protected action still requires server authorization.
          </OperationsNotice>
        </div>
      )}
      {error && <div className="mb-5"><OperationsNotice tone="danger" title="Operations data needs attention">{error}</OperationsNotice></div>}
      {notice && <div className="mb-5"><OperationsNotice tone="success" title="Access updated">{notice}</OperationsNotice></div>}

      {!overview && refreshing ? (
        <OperationsSkeleton rows={5} />
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]" aria-label="Current operational status">
            <div className={`rounded-3xl border p-6 ${urgentTotal > 0 ? "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20" : "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20"}`}>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <StatusBadge tone={urgentTotal > 0 ? "warning" : "success"} dot>
                    {urgentTotal > 0 ? "Action required" : "No unresolved priority work"}
                  </StatusBadge>
                  <h2 className="mt-4 text-xl font-extrabold tracking-[-0.02em] text-slate-950 dark:text-white">
                    {urgentTotal > 0 ? `${urgentTotal} operational item${urgentTotal === 1 ? "" : "s"} need attention` : "The care network has no open priority items"}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {urgentTotal > 0 ? "Resolve safety and care-access work before routine administration." : "Continue monitoring coverage, service health and the editorial queue."}
                  </p>
                </div>
                <div className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">{timeLabel(lastUpdated)}</div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {urgentWork.map((item) => (
                  <Link key={item.href} href={item.href} className="group rounded-2xl border border-white/80 bg-white/80 p-4 transition hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-800 dark:bg-[#1b1922]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="material-symbols-outlined text-xl text-slate-500 group-hover:text-primary" aria-hidden="true">{item.icon}</span>
                      <span className={`text-2xl font-extrabold tabular-nums ${item.value > 0 ? "text-slate-950 dark:text-white" : "text-slate-400"}`}>{item.value}</span>
                    </div>
                    <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.description}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white dark:border-slate-800">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/55">Live care coverage</p>
              <div className="mt-5 flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${(counts?.available || 0) > 0 ? "bg-emerald-400" : "bg-red-400"}`} aria-hidden="true" />
                <p className="text-lg font-extrabold">{coverageLabel}</p>
              </div>
              <dl className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-white/60">In session</dt><dd className="font-bold tabular-nums">{counts?.inSession || 0}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-white/60">Live sessions</dt><dd className="font-bold tabular-nums">{counts?.liveSessions || 0}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-white/60">Verified professionals</dt><dd className="font-bold tabular-nums">{counts?.counsellors || 0}</dd></div>
              </dl>
              <Link href="/admin/counsellors" className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-white">
                Manage coverage
                <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span>
              </Link>
            </div>
          </section>

          <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Network totals">
            <OperationsStat label="Registered members" value={counts?.members || 0} icon="group" tone="primary" helper="Member accounts in the service" />
            <OperationsStat label="Verified counsellors" value={counts?.counsellors || 0} icon="clinical_notes" tone="success" helper="Approved professional profiles" />
            <OperationsStat label="Available now" value={counts?.available || 0} icon="support_agent" tone={(counts?.available || 0) > 0 ? "success" : "danger"} helper="Eligible with a current heartbeat" />
            <OperationsStat label="Live sessions" value={counts?.liveSessions || 0} icon="forum" tone="info" helper="Requested through active care" />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1b1922] sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-extrabold text-slate-950 dark:text-white">Credential review queue</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Oldest pending applications appear first.</p>
                </div>
                <Link href="/admin/counsellors" className="inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-bold text-primary hover:bg-primary/5">Open queue</Link>
              </div>
              <div className="mt-5">
                {overview?.applications.length ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {overview.applications.map((application, index) => (
                      <Link key={application.id} href={`/admin/counsellors?application=${application.id}`} className="group flex items-center gap-3 py-4 first:pt-0 last:pb-0">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-sm font-extrabold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">{index + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{application.name}</span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{application.title}</span>
                        </span>
                        <span className="material-symbols-outlined text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true">arrow_forward</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <OperationsEmptyState icon="verified" title="Review queue is clear" description="New professional applications will appear here after secure KYC submission." />
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1b1922] sm:p-6">
              <h2 className="font-extrabold text-slate-950 dark:text-white">Operations workspaces</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Move directly into specialist workflows.</p>
              <div className="mt-4 space-y-2">
                {workspaces.map((workspace) => (
                  <Link key={workspace.href} href={workspace.href} className="group flex items-center gap-3 rounded-2xl p-3 transition hover:bg-slate-50 dark:hover:bg-slate-900">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${workspace.tone}`}><span className="material-symbols-outlined text-xl" aria-hidden="true">{workspace.icon}</span></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-900 dark:text-white">{workspace.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{workspace.description}</span>
                    </span>
                    <span className="material-symbols-outlined text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true">chevron_right</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#1b1922]">
            <button
              type="button"
              onClick={() => setShowAccess((current) => !current)}
              aria-expanded={showAccess}
              className="flex min-h-16 w-full items-center gap-3 px-5 text-left sm:px-6"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <span className="material-symbols-outlined" aria-hidden="true">manage_accounts</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold text-slate-950 dark:text-white">Administrator access management</span>
                <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Sensitive role changes for existing accounts</span>
              </span>
              <span className="material-symbols-outlined text-slate-400" aria-hidden="true">{showAccess ? "expand_less" : "expand_more"}</span>
            </button>
            {showAccess && (
              <div className="border-t border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
                <OperationsNotice tone="warning" title="High-impact action">
                  Grant access only to a known staff account. Role changes are server-authorised and audit logged.
                </OperationsNotice>
                <form onSubmit={assignRole} className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Existing account email
                    <input type="email" required value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} placeholder="name@organisation.org" className="mt-2 min-h-12 w-full rounded-xl border-slate-300 bg-white text-base dark:border-slate-700 dark:bg-slate-900" />
                  </label>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Access change
                    <select value={accountRole} onChange={(event) => setAccountRole(event.target.value as "admin" | "user")} className="mt-2 min-h-12 w-full rounded-xl border-slate-300 bg-white text-base dark:border-slate-700 dark:bg-slate-900">
                      <option value="admin">Grant administrator</option>
                      <option value="user">Remove administrator</option>
                    </select>
                  </label>
                  <button disabled={saving} className={`min-h-12 self-end rounded-xl px-5 text-sm font-bold text-white disabled:opacity-50 ${accountRole === "user" ? "bg-red-700 hover:bg-red-800" : "bg-primary hover:bg-primary-dark"}`}>
                    {saving ? "Updating…" : "Confirm change"}
                  </button>
                </form>
              </div>
            )}
          </section>
        </>
      )}
    </AdminShell>
  );
}

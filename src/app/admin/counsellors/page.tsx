"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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

interface OperationsRecord {
  id: string;
  name: string;
  title: string;
  verificationStatus: "pending" | "verified" | "suspended" | "expired";
  credentialExpiresAt: string | null;
  maxConcurrentSessions: number;
  acceptingNewSessions: boolean;
  crisisTrained: boolean;
  supervisorId: string;
  availableHours: { start: string; end: string; days: string[] };
  liveStatus: "available" | "in_session" | "offline";
  lastHeartbeat: string | null;
  operationsNote?: string;
}

interface ApplicationRecord {
  id: string;
  name: string;
  title: string;
  legalName: string;
  registrationNumber: string;
  credentialType: string;
  credentialExpiresAt: string | null;
  documentReferences: string[];
  languages: string[];
  specializations: string[];
  submittedAt: string | null;
}

type ApiResult<T> = { success?: boolean; data?: T; error?: string };
type DirectoryFilter = "all" | "available" | "in_session" | "offline" | "restricted";
type ReviewState = { application: ApplicationRecord; decision: "approve" | "reject" } | null;

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function liveStatusMeta(status: OperationsRecord["liveStatus"]) {
  if (status === "available") return { label: "Available", tone: "success" as const };
  if (status === "in_session") return { label: "In session", tone: "warning" as const };
  return { label: "Offline", tone: "neutral" as const };
}

function verificationMeta(status: OperationsRecord["verificationStatus"]) {
  if (status === "verified") return { label: "Verified", tone: "success" as const };
  if (status === "suspended") return { label: "Suspended", tone: "danger" as const };
  if (status === "expired") return { label: "Credential expired", tone: "danger" as const };
  return { label: "Pending", tone: "warning" as const };
}

function dateDistance(value: string | null) {
  if (!value) return "No expiry recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid expiry date";
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today";
  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
}

async function authorizedFetch(url: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Your secure session expired. Sign in again.");
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
}

export default function CounsellorOperationsPage() {
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<OperationsRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DirectoryFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [openedDocuments, setOpenedDocuments] = useState<Set<string>>(new Set());

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const response = await authorizedFetch("/api/admin/counsellors");
      const result = await readApiResponse<ApiResult<{ counsellors: OperationsRecord[]; applications: ApplicationRecord[] }>>(response);
      if (!response.ok) throw new Error(result.error || "Could not load the care network");
      if (!result.data) throw new Error("The care network returned no data");
      setRecords(result.data.counsellors || []);
      setApplications(result.data.applications || []);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the care network");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const refreshVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    const timer = window.setInterval(refreshVisible, 5_000);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [load]);

  useEffect(() => {
    const applicationId = searchParams.get("application");
    if (applicationId) {
      document.getElementById(`application-${applicationId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [applications, searchParams]);

  const update = (id: string, changes: Partial<OperationsRecord>) => {
    setRecords((current) => current.map((record) => record.id === id ? { ...record, ...changes } : record));
  };

  const review = async () => {
    if (!reviewState) return;
    if (reviewState.decision === "reject" && reviewNote.trim().length < 10) {
      setError("Add a clear review note so the applicant knows what to correct.");
      return;
    }
    setSaving(reviewState.application.id);
    setError("");
    setNotice("");
    try {
      const response = await authorizedFetch(`/api/admin/counsellors/${reviewState.application.id}/review`, {
        method: "POST",
        body: JSON.stringify({ decision: reviewState.decision, note: reviewNote.trim() }),
      });
      const result = await readApiResponse<ApiResult<Record<string, never>>>(response);
      if (!response.ok) throw new Error(result.error || "Unable to review the application");
      setNotice(
        reviewState.decision === "approve"
          ? `${reviewState.application.name} is now a verified counsellor.`
          : `${reviewState.application.name} can revise the application using your review note.`,
      );
      setReviewState(null);
      setReviewNote("");
      await load(true);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to review the application");
    } finally {
      setSaving(null);
    }
  };

  const openDocument = async (applicationId: string, index: number) => {
    setError("");
    try {
      const response = await authorizedFetch(`/api/admin/counsellors/${applicationId}/documents?index=${index}`);
      const result = await readApiResponse<ApiResult<{ url: string }>>(response);
      if (!response.ok || !result.data?.url) throw new Error(result.error || "Could not open the private document");
      const opened = window.open(result.data.url, "_blank", "noopener,noreferrer");
      if (!opened) throw new Error("Your browser blocked the secure document window. Allow pop-ups and try again.");
      setOpenedDocuments((current) => new Set(current).add(`${applicationId}:${index}`));
    } catch (documentError) {
      setError(documentError instanceof Error ? documentError.message : "Could not open the private document");
    }
  };

  const save = async (record: OperationsRecord) => {
    setSaving(record.id);
    setError("");
    setNotice("");
    try {
      const response = await authorizedFetch(`/api/admin/counsellors/${record.id}/operations`, {
        method: "PATCH",
        body: JSON.stringify(record),
      });
      const result = await readApiResponse<ApiResult<Record<string, never>>>(response);
      if (!response.ok) throw new Error(result.error || "Unable to save the counsellor record");
      setNotice(`${record.name}'s operational settings were saved and audit logged.`);
      await load(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save the counsellor record");
    } finally {
      setSaving(null);
    }
  };

  const filteredRecords = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesText = !needle || `${record.name} ${record.title}`.toLowerCase().includes(needle);
      const matchesFilter =
        filter === "all" ||
        (filter === "restricted"
          ? ["suspended", "expired"].includes(record.verificationStatus)
          : record.liveStatus === filter);
      return matchesText && matchesFilter;
    });
  }, [filter, query, records]);

  const counts = {
    available: records.filter((record) => record.liveStatus === "available").length,
    inSession: records.filter((record) => record.liveStatus === "in_session").length,
    offline: records.filter((record) => record.liveStatus === "offline").length,
    expiring: records.filter((record) => {
      if (!record.credentialExpiresAt) return false;
      const days = (new Date(record.credentialExpiresAt).getTime() - Date.now()) / 86_400_000;
      return days >= 0 && days <= 30;
    }).length,
  };

  return (
    <AdminShell>
      <OperationsPageHeader
        eyebrow="Care network"
        title="Counsellor operations"
        description="Verify professional identity, control service eligibility, manage capacity and monitor live availability from one accountable workspace."
        actions={
          <button type="button" onClick={() => void load()} disabled={refreshing} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
            <span className={`material-symbols-outlined text-xl ${refreshing ? "animate-spin" : ""}`} aria-hidden="true">refresh</span>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      {error && <div className="mb-5"><OperationsNotice tone="danger" title="Care network needs attention">{error}</OperationsNotice></div>}
      {notice && <div className="mb-5"><OperationsNotice tone="success" title="Change completed">{notice}</OperationsNotice></div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Counsellor network summary">
        <OperationsStat label="Available now" value={counts.available} icon="support_agent" tone={counts.available ? "success" : "danger"} helper="Eligible with a current heartbeat" />
        <OperationsStat label="In session" value={counts.inSession} icon="forum" tone="warning" helper="Currently assigned to live care" />
        <OperationsStat label="Pending KYC" value={applications.length} icon="badge" tone={applications.length ? "warning" : "neutral"} helper="Applications awaiting review" />
        <OperationsStat label="Expiring within 30 days" value={counts.expiring} icon="event_busy" tone={counts.expiring ? "danger" : "neutral"} helper="Credentials requiring follow-up" />
      </section>

      <section className="mt-7" aria-labelledby="kyc-queue-heading">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="kyc-queue-heading" className="text-lg font-extrabold text-slate-950 dark:text-white">Credential review queue</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review the professional identity, credential validity and private evidence before deciding.</p>
          </div>
          <StatusBadge tone={applications.length ? "warning" : "success"}>{applications.length} pending</StatusBadge>
        </div>
        {loading ? (
          <OperationsSkeleton rows={2} />
        ) : applications.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {applications.map((application) => {
              const expired = application.credentialExpiresAt
                ? new Date(application.credentialExpiresAt).getTime() <= Date.now()
                : true;
              const viewed = application.documentReferences.filter((_, index) => openedDocuments.has(`${application.id}:${index}`)).length;
              return (
                <article id={`application-${application.id}`} key={application.id} className="rounded-3xl border border-amber-200 bg-white p-5 shadow-soft dark:border-amber-900 dark:bg-[#1b1922] sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <StatusBadge tone="warning">Awaiting KYC review</StatusBadge>
                      <h3 className="mt-3 truncate text-lg font-extrabold text-slate-950 dark:text-white">{application.name}</h3>
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{application.title}</p>
                    </div>
                    {application.submittedAt && <span className="shrink-0 text-[11px] font-semibold text-slate-400">{new Date(application.submittedAt).toLocaleDateString()}</span>}
                  </div>
                  <dl className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-900 sm:grid-cols-2">
                    <div><dt className="text-xs text-slate-400">Legal name</dt><dd className="mt-1 font-bold text-slate-800 dark:text-slate-200">{application.legalName || "Not supplied"}</dd></div>
                    <div><dt className="text-xs text-slate-400">Registration number</dt><dd className="mt-1 font-bold text-slate-800 dark:text-slate-200">{application.registrationNumber || "Not supplied"}</dd></div>
                    <div><dt className="text-xs text-slate-400">Credential</dt><dd className="mt-1 font-bold text-slate-800 dark:text-slate-200">{application.credentialType || "Not supplied"}</dd></div>
                    <div><dt className="text-xs text-slate-400">Validity</dt><dd className={`mt-1 font-bold ${expired ? "text-red-700 dark:text-red-300" : "text-slate-800 dark:text-slate-200"}`}>{application.credentialExpiresAt ? new Date(application.credentialExpiresAt).toLocaleDateString() : "Not supplied"}</dd></div>
                  </dl>
                  {(application.languages.length > 0 || application.specializations.length > 0) && (
                    <div className="mt-4 space-y-3 text-xs">
                      {application.languages.length > 0 && <div><p className="font-bold uppercase tracking-wide text-slate-400">Languages</p><p className="mt-1 text-slate-600 dark:text-slate-300">{application.languages.join(", ")}</p></div>}
                      {application.specializations.length > 0 && <div><p className="font-bold uppercase tracking-wide text-slate-400">Areas of practice</p><p className="mt-1 text-slate-600 dark:text-slate-300">{application.specializations.join(", ")}</p></div>}
                    </div>
                  )}
                  <div className="mt-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Private evidence</p>
                      <span className="text-[11px] text-slate-400">{viewed}/{application.documentReferences.length} opened this session</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {application.documentReferences.length ? application.documentReferences.map((reference, index) => (
                        <button key={reference} type="button" onClick={() => void openDocument(application.id, index)} className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold ${openedDocuments.has(`${application.id}:${index}`) ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200"}`}>
                          <span className="material-symbols-outlined text-lg" aria-hidden="true">{openedDocuments.has(`${application.id}:${index}`) ? "check_circle" : "lock"}</span>
                          Document {index + 1}
                        </button>
                      )) : <span className="text-sm font-semibold text-red-700 dark:text-red-300">No KYC document references were submitted.</span>}
                    </div>
                  </div>
                  {expired && <div className="mt-4"><OperationsNotice tone="danger">This credential is missing or expired and cannot be approved.</OperationsNotice></div>}
                  <div className="mt-5 flex flex-col gap-2 xs:flex-row">
                    <button type="button" onClick={() => { setReviewState({ application, decision: "approve" }); setReviewNote(""); }} disabled={expired || saving === application.id} className="min-h-11 flex-1 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Approve credentials</button>
                    <button type="button" onClick={() => { setReviewState({ application, decision: "reject" }); setReviewNote(""); }} disabled={saving === application.id} className="min-h-11 flex-1 rounded-xl border border-red-300 px-4 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30">Request changes</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <OperationsEmptyState icon="verified" title="Credential queue is clear" description="New KYC applications will appear here after secure submission." />
        )}
      </section>

      <section className="mt-8" aria-labelledby="directory-heading">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="directory-heading" className="text-lg font-extrabold text-slate-950 dark:text-white">Professional directory</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Operational settings take effect in member matching after a successful save.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative">
              <span className="sr-only">Search counsellors</span>
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-400" aria-hidden="true">search</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or title" className="min-h-11 w-full rounded-xl border-slate-300 bg-white pl-10 text-sm dark:border-slate-700 dark:bg-[#1b1922] sm:w-64" />
            </label>
            <select aria-label="Filter counsellor directory" value={filter} onChange={(event) => setFilter(event.target.value as DirectoryFilter)} className="min-h-11 rounded-xl border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-[#1b1922]">
              <option value="all">All counsellors</option>
              <option value="available">Available now</option>
              <option value="in_session">In session</option>
              <option value="offline">Offline</option>
              <option value="restricted">Suspended or expired</option>
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <OperationsSkeleton rows={4} />
          ) : filteredRecords.length ? filteredRecords.map((record) => {
            const status = liveStatusMeta(record.liveStatus);
            const verification = verificationMeta(record.verificationStatus);
            const isExpanded = expanded === record.id;
            const expiryWarning = record.credentialExpiresAt && new Date(record.credentialExpiresAt).getTime() - Date.now() <= 30 * 86_400_000;
            return (
              <article key={record.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#1b1922]">
                <button type="button" onClick={() => setExpanded(isExpanded ? null : record.id)} aria-expanded={isExpanded} className="flex w-full items-center gap-4 p-4 text-left sm:p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">{record.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "SC"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-slate-950 dark:text-white">{record.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{record.title}</span>
                  </span>
                  <span className="hidden items-center gap-2 sm:flex">
                    <StatusBadge tone={verification.tone}>{verification.label}</StatusBadge>
                    <StatusBadge tone={status.tone} dot>{status.label}</StatusBadge>
                  </span>
                  <span className="material-symbols-outlined text-slate-400" aria-hidden="true">{isExpanded ? "expand_less" : "expand_more"}</span>
                </button>
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 dark:border-slate-800 sm:p-5">
                    <div className="mb-5 flex flex-wrap gap-2 sm:hidden"><StatusBadge tone={verification.tone}>{verification.label}</StatusBadge><StatusBadge tone={status.tone} dot>{status.label}</StatusBadge></div>
                    <div className="mb-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400 sm:grid-cols-3">
                      <div><span className="block font-bold uppercase tracking-wide">Live signal</span><span className="mt-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">{record.lastHeartbeat ? new Date(record.lastHeartbeat).toLocaleString() : "Never received"}</span></div>
                      <div><span className="block font-bold uppercase tracking-wide">Credential</span><span className={`mt-1 block text-sm font-semibold ${expiryWarning ? "text-red-700 dark:text-red-300" : "text-slate-800 dark:text-slate-200"}`}>{dateDistance(record.credentialExpiresAt)}</span></div>
                      <div><span className="block font-bold uppercase tracking-wide">Shift</span><span className="mt-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">{record.availableHours.start}–{record.availableHours.end}</span></div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        Verification state
                        <select value={record.verificationStatus} onChange={(event) => update(record.id, { verificationStatus: event.target.value as OperationsRecord["verificationStatus"], operationsNote: "" })} className="mt-2 min-h-11 w-full rounded-xl border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-900">
                          <option value="verified">Verified</option>
                          <option value="suspended">Suspended</option>
                          <option value="expired">Expired</option>
                          <option value="pending">Pending</option>
                        </select>
                      </label>
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        Credential expiry
                        <input type="date" value={record.credentialExpiresAt?.slice(0, 10) || ""} onChange={(event) => update(record.id, { credentialExpiresAt: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-900" />
                      </label>
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        Maximum active sessions
                        <input type="number" min={1} max={10} value={record.maxConcurrentSessions} onChange={(event) => update(record.id, { maxConcurrentSessions: Number(event.target.value) })} className="mt-2 min-h-11 w-full rounded-xl border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-900" />
                      </label>
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        Shift starts
                        <input type="time" value={record.availableHours.start} onChange={(event) => update(record.id, { availableHours: { ...record.availableHours, start: event.target.value } })} className="mt-2 min-h-11 w-full rounded-xl border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-900" />
                      </label>
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        Shift ends
                        <input type="time" value={record.availableHours.end} onChange={(event) => update(record.id, { availableHours: { ...record.availableHours, end: event.target.value } })} className="mt-2 min-h-11 w-full rounded-xl border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-900" />
                      </label>
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        Supervisor UID
                        <input value={record.supervisorId} onChange={(event) => update(record.id, { supervisorId: event.target.value })} placeholder="Optional supervisor account ID" className="mt-2 min-h-11 w-full rounded-xl border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-900" />
                      </label>
                    </div>

                    <fieldset className="mt-5">
                      <legend className="text-sm font-bold text-slate-700 dark:text-slate-200">Scheduled working days</legend>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {WEEKDAYS.map((day) => {
                          const selected = record.availableHours.days.includes(day);
                          return (
                            <button key={day} type="button" aria-pressed={selected} onClick={() => update(record.id, { availableHours: { ...record.availableHours, days: selected ? record.availableHours.days.filter((value) => value !== day) : [...record.availableHours.days, day] } })} className={`min-h-10 rounded-xl px-3 text-xs font-bold ${selected ? "bg-primary text-white" : "border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>
                              {day.slice(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div className="mt-5 flex flex-wrap gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                      <label className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                        <input type="checkbox" checked={record.acceptingNewSessions} onChange={(event) => update(record.id, { acceptingNewSessions: event.target.checked })} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary" />
                        Accepting new sessions
                      </label>
                      <label className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                        <input type="checkbox" checked={record.crisisTrained} onChange={(event) => update(record.id, { crisisTrained: event.target.checked })} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary" />
                        Crisis-response trained
                      </label>
                    </div>

                    {["suspended", "expired"].includes(record.verificationStatus) && (
                      <label className="mt-5 block text-sm font-bold text-red-800 dark:text-red-200">
                        Reason for restricting care access
                        <textarea required minLength={10} maxLength={500} rows={3} value={record.operationsNote || ""} onChange={(event) => update(record.id, { operationsNote: event.target.value })} placeholder="Record the operational reason for the audit trail." className="mt-2 w-full rounded-xl border-red-300 bg-red-50 text-base dark:border-red-900 dark:bg-red-950/20" />
                      </label>
                    )}

                    <div className="mt-5 flex justify-end border-t border-slate-100 pt-5 dark:border-slate-800">
                      <button type="button" onClick={() => void save(record)} disabled={saving === record.id || record.availableHours.days.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">
                        <span className="material-symbols-outlined text-xl" aria-hidden="true">save</span>
                        {saving === record.id ? "Saving securely…" : "Save operational settings"}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          }) : (
            <OperationsEmptyState icon="person_search" title="No counsellors match" description="Change the search term or status filter to see more of the directory." />
          )}
        </div>
      </section>

      {reviewState && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="review-dialog-title" className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-[#1b1922] sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <StatusBadge tone={reviewState.decision === "approve" ? "success" : "danger"}>{reviewState.decision === "approve" ? "Approve credentials" : "Request changes"}</StatusBadge>
                <h2 id="review-dialog-title" className="mt-3 text-xl font-extrabold text-slate-950 dark:text-white">{reviewState.application.name}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{reviewState.application.credentialType} · {reviewState.application.registrationNumber}</p>
              </div>
              <button type="button" onClick={() => setReviewState(null)} aria-label="Close review dialog" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
            </div>
            <div className="mt-5">
              <OperationsNotice tone={reviewState.decision === "approve" ? "warning" : "info"}>
                {reviewState.decision === "approve" ? "Approval activates the professional role and makes the counsellor eligible for care after they go available." : "Your note is shown to the applicant so they can correct and resubmit the application."}
              </OperationsNotice>
            </div>
            <label className="mt-5 block text-sm font-bold text-slate-700 dark:text-slate-200">
              {reviewState.decision === "approve" ? "Internal review note (optional)" : "Required applicant feedback"}
              <textarea autoFocus rows={4} minLength={reviewState.decision === "reject" ? 10 : undefined} maxLength={500} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder={reviewState.decision === "approve" ? "Record any relevant verification context." : "Explain exactly what must be corrected before resubmission."} className="mt-2 w-full rounded-xl border-slate-300 bg-white text-base dark:border-slate-700 dark:bg-slate-900" />
              <span className="mt-1 block text-right text-[11px] text-slate-400">{reviewNote.length}/500</span>
            </label>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setReviewState(null)} className="min-h-11 rounded-xl px-4 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
              <button type="button" onClick={() => void review()} disabled={saving === reviewState.application.id || (reviewState.decision === "reject" && reviewNote.trim().length < 10)} className={`min-h-11 rounded-xl px-5 text-sm font-bold text-white disabled:opacity-45 ${reviewState.decision === "approve" ? "bg-emerald-700 hover:bg-emerald-800" : "bg-red-700 hover:bg-red-800"}`}>
                {saving === reviewState.application.id ? "Recording decision…" : reviewState.decision === "approve" ? "Confirm approval" : "Send change request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

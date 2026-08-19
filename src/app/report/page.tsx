"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { auth } from "@/lib/authClient";
import { readApiResponse } from "@/lib/apiResponse";

const TARGETS = [
  ["ai_response", "An answer from Sister"],
  ["counsellor", "A counsellor"],
  ["session", "A counselling session or call"],
  ["message", "A message"],
  ["privacy", "Privacy or data handling"],
  ["technical", "Access or technical problem"],
  ["other", "Something else"],
] as const;
const CATEGORIES = [
  ["unsafe_advice", "Unsafe or harmful advice"],
  ["harassment", "Harassment or inappropriate behaviour"],
  ["privacy", "Privacy concern"],
  ["incorrect_information", "Incorrect information"],
  ["access_problem", "Could not access support"],
  ["other", "Other concern"],
] as const;

interface OwnReport {
  id: string;
  target_type: string;
  category: string;
  status: string;
  created_at: string;
}

function ReportPageContent() {
  const params = useSearchParams();
  const requestedTarget = params.get("type") || "";
  const [targetType, setTargetType] = useState(TARGETS.some(([value]) => value === requestedTarget) ? requestedTarget : "other");
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reports, setReports] = useState<OwnReport[]>([]);

  const call = useCallback(async (init?: RequestInit) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Your secure session expired. Sign in again.");
    return fetch("/api/reports", {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await call();
      const result = await readApiResponse<{ success?: boolean; data?: { reports?: OwnReport[] } }>(response);
      if (response.ok) setReports(result.data?.reports || []);
    } catch {
      // Submission stays available even when report history cannot be loaded.
    }
  }, [call]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (description.trim().length < 10) {
      setError("Please add at least 10 characters so the review team can understand what happened.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const response = await call({
        method: "POST",
        body: JSON.stringify({
          targetType,
          targetId: params.get("targetId"),
          category,
          description: description.trim(),
        }),
      });
      const result = await readApiResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "Your report could not be submitted.");
      setDescription("");
      setSuccess("Your report was sent privately to the SisterCare review team.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your report could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light pb-28 dark:bg-background-dark md:pb-10">
      <Header variant="app" />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-3xl border border-border-light bg-white p-5 shadow-soft dark:border-border-dark dark:bg-card-dark sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Private reporting</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-primary dark:text-white">Tell us what went wrong</h1>
            <p className="mt-2 text-sm leading-6 text-text-secondary dark:text-gray-300">Reports are reviewed by authorised SisterCare administrators. Include only the details needed to investigate.</p>
            {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
            {success && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{success}</p>}
            <form onSubmit={submit} className="mt-6 space-y-5">
              <label className="block text-sm font-bold text-text-primary dark:text-white">What is the report about?
                <select value={targetType} onChange={(event) => setTargetType(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border-border-light bg-white text-base dark:border-border-dark dark:bg-background-dark">
                  {TARGETS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-bold text-text-primary dark:text-white">What best describes the concern?
                <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border-border-light bg-white text-base dark:border-border-dark dark:bg-background-dark">
                  {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-bold text-text-primary dark:text-white">What happened?
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={7} maxLength={2000} placeholder="Describe what happened and what you need us to review…" className="mt-2 w-full rounded-xl border-border-light bg-white text-base dark:border-border-dark dark:bg-background-dark" />
                <span className="mt-1 block text-right text-xs font-normal text-text-secondary">{description.length}/2000</span>
              </label>
              <button type="submit" disabled={submitting} className="min-h-12 w-full rounded-xl bg-primary px-5 font-bold text-white hover:bg-primary-dark disabled:opacity-55">{submitting ? "Sending privately…" : "Submit private report"}</button>
            </form>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">
              <span className="material-symbols-outlined" aria-hidden="true">emergency</span>
              <h2 className="mt-2 font-bold">This form is not emergency help</h2>
              <p className="mt-2 text-sm leading-6">For immediate danger in Uganda, call 999 or 112. For child protection and gender-based violence support, call Sauti 116.</p>
            </div>
            <div className="rounded-2xl border border-border-light bg-white p-5 dark:border-border-dark dark:bg-card-dark">
              <h2 className="font-bold text-text-primary dark:text-white">Your recent reports</h2>
              <div className="mt-3 space-y-2">
                {reports.length ? reports.slice(0, 5).map((report) => (
                  <div key={report.id} className="rounded-xl bg-background-light p-3 text-sm dark:bg-background-dark">
                    <div className="flex items-center justify-between gap-2"><span className="font-semibold capitalize text-text-primary dark:text-white">{report.category.replaceAll("_", " ")}</span><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold capitalize text-primary">{report.status}</span></div>
                    <p className="mt-1 text-xs text-text-secondary">{new Date(report.created_at).toLocaleDateString()}</p>
                  </div>
                )) : <p className="text-sm leading-6 text-text-secondary">No reports submitted from this account.</p>}
              </div>
            </div>
            <Link href="/help" className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-bold text-primary"><span className="material-symbols-outlined" aria-hidden="true">help</span>Open help centre</Link>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function ReportPage() {
  return <ProtectedRoute requireOnboarding={false}><ReportPageContent /></ProtectedRoute>;
}

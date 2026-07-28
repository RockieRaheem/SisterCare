"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import { auth } from "@/lib/firebase";
import { COUNSELLOR_SPECIALTIES } from "@/lib/counsellors";

async function authorisedFetch(path: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in before applying.");
  return fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers } });
}

export default function CounsellorApplicationPage() {
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", title: "", bio: "", legalName: "", registrationNumber: "", credentialType: "", credentialExpiresAt: "", phoneNumber: "", languages: "English", documents: "", specializations: [] as string[] });
  useEffect(() => { authorisedFetch("/api/counsellor/application").then((response) => response.json()).then((result) => { if (result.data?.application?.status) setStatus(result.data.application.status); }).catch(() => {}); }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setStatus("");
    try {
      const response = await authorisedFetch("/api/counsellor/application", { method: "POST", body: JSON.stringify({ ...form, languages: form.languages.split(",").map((item) => item.trim()).filter(Boolean), documentReferences: form.documents.split("\n").map((item) => item.trim()).filter(Boolean) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not submit your application."); setStatus("pending");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not submit your application."); } finally { setSubmitting(false); }
  };
  const set = (key: keyof typeof form, value: string | string[]) => setForm((current) => ({ ...current, [key]: value }));
  return <div className="app-page"><Header variant="app" /><main className="main-content mx-auto w-full max-w-2xl px-4 py-8 sm:px-6"><Link href="/counsellor" className="text-sm font-medium text-primary">Back to counsellor portal</Link><h1 className="mt-4 text-3xl font-bold text-text-primary dark:text-white">Join the care network</h1><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Your application stays private until an authorised reviewer completes KYC. Approval creates your counsellor profile, but you remain offline until you sign in and choose Available.</p>{status === "pending" || status === "verified" ? <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm text-text-primary dark:text-white">{status === "verified" ? "Your KYC has been approved. Sign out and back in to activate your counsellor portal." : "Your KYC application is awaiting review. We will not show your profile or route users to you until it is approved."}</div> : <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-card-dark"><div className="grid gap-4 sm:grid-cols-2">{[["name","Professional name"],["title","Professional title"],["legalName","Legal name"],["registrationNumber","Registration or licence number"],["credentialType","Credential type"],["phoneNumber","Professional phone number"]].map(([key,label]) => <label key={key} className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}<input required value={form[key as keyof typeof form] as string} onChange={(e) => set(key as keyof typeof form, e.target.value)} className="mt-1 w-full rounded-xl border-gray-300 dark:bg-gray-800" /></label>)}</div><label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Credential expiry<input required type="date" value={form.credentialExpiresAt} onChange={(e) => set("credentialExpiresAt", e.target.value)} className="mt-1 w-full rounded-xl border-gray-300 dark:bg-gray-800" /></label><label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Professional bio<textarea required rows={4} value={form.bio} onChange={(e) => set("bio", e.target.value)} className="mt-1 w-full rounded-xl border-gray-300 dark:bg-gray-800" /></label><label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Languages, separated by commas<input required value={form.languages} onChange={(e) => set("languages", e.target.value)} className="mt-1 w-full rounded-xl border-gray-300 dark:bg-gray-800" /></label><fieldset><legend className="text-sm font-medium text-gray-700 dark:text-gray-200">Areas of practice</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{COUNSELLOR_SPECIALTIES.map((specialty) => <label key={specialty} className="text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={form.specializations.includes(specialty)} onChange={(e) => set("specializations", e.target.checked ? [...form.specializations, specialty] : form.specializations.filter((item) => item !== specialty))} className="mr-2" />{specialty}</label>)}</div></fieldset><label className="block text-sm font-medium text-gray-700 dark:text-gray-200">KYC document references<textarea required rows={3} placeholder="One secure Firebase Storage URL per line" value={form.documents} onChange={(e) => set("documents", e.target.value)} className="mt-1 w-full rounded-xl border-gray-300 dark:bg-gray-800" /></label>{status && <p className="text-sm text-red-700">{status}</p>}<button disabled={submitting} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{submitting ? "Submitting…" : "Submit for KYC review"}</button></form>}</main></div>;
}

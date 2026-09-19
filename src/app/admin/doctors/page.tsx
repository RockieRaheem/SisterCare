"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import AdminShell from "@/components/admin/AdminShell";
import { OperationsNotice, OperationsPageHeader, OperationsSkeleton, StatusBadge } from "@/components/operations/OperationsUI";
import { authenticatedFetch } from "@/lib/authenticatedFetch";

type DoctorRow = {
  id: string;
  professional_name: string;
  title: string;
  registration_number: string;
  licensing_body: string;
  credential_expires_at: string;
  verification_status: string;
  status: string;
  accepting_appointments: boolean;
  last_heartbeat_at: string | null;
  photoURL?: string;
  profiles?: { email?: string } | null;
};

const initialForm = {
  email: "", professionalName: "", title: "Medical doctor", bio: "",
  registrationNumber: "", licensingBody: "Uganda Medical and Dental Practitioners Council",
  credentialExpiresAt: "", evidenceReference: "", verificationNote: "",
  specializations: "General Practice", languages: "English", yearsExperience: "0",
  credentialVerified: false,
};

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await authenticatedFetch("/api/admin/doctors", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Doctor network could not be loaded");
      setDoctors(result.data?.doctors || []);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Doctor network could not be loaded");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const response = await authenticatedFetch("/api/admin/doctors", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, yearsExperience: Number(form.yearsExperience), specializations: form.specializations.split(","), languages: form.languages.split(",") }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Doctor verification failed");
      setNotice("Doctor credentials recorded and the clinical workspace was activated.");
      setForm(initialForm); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Doctor verification failed"); }
    finally { setSaving(false); }
  };

  const update = async (doctorId: string, action: "suspend" | "restore") => {
    const response = await authenticatedFetch("/api/admin/doctors", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doctorId, action }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error || "Doctor status could not be updated"); return; }
    setNotice(action === "suspend" ? "Doctor access suspended." : "Doctor access restored offline."); await load();
  };

  return <AdminShell>
    <OperationsPageHeader eyebrow="Clinical governance" title="Doctor network" description="Activate doctor access only after independently checking identity, registration, licensing body and credential validity." actions={<button onClick={() => void load()} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white dark:bg-white dark:text-slate-950">Refresh</button>} />
    {error && <div className="mb-5"><OperationsNotice tone="danger">{error}</OperationsNotice></div>}
    {notice && <div className="mb-5"><OperationsNotice tone="success">{notice}</OperationsNotice></div>}
    <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#1b1922]">
        <h2 className="text-lg font-extrabold">Verify an existing account</h2>
        <p className="mt-1 text-sm text-slate-500">This does not replace KYC. Keep the source reference and review note auditable.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            ["email", "Account email", "email"], ["professionalName", "Professional name", "text"], ["title", "Professional title", "text"], ["registrationNumber", "Registration number", "text"], ["licensingBody", "Licensing body", "text"], ["credentialExpiresAt", "Credential expiry", "date"], ["evidenceReference", "Evidence reference", "text"], ["yearsExperience", "Years of experience", "number"], ["specializations", "Specialties, comma separated", "text"], ["languages", "Languages, comma separated", "text"],
          ].map(([key, label, type]) => <label key={key} className="block text-sm font-bold">{label}<input required type={type} value={String(form[key as keyof typeof form])} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-2 min-h-11 w-full rounded-xl border-slate-300 bg-white text-base dark:border-slate-700 dark:bg-slate-900" /></label>)}
        </div>
        <label className="mt-4 block text-sm font-bold">Professional bio<textarea value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} maxLength={1200} rows={3} className="mt-2 w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-900" /></label>
        <label className="mt-4 block text-sm font-bold">Private verification note<textarea required value={form.verificationNote} onChange={(event) => setForm((current) => ({ ...current, verificationNote: event.target.value }))} maxLength={1000} rows={3} className="mt-2 w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-900" /></label>
        <label className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-950"><input required type="checkbox" checked={form.credentialVerified} onChange={(event) => setForm((current) => ({ ...current, credentialVerified: event.target.checked }))} className="mt-1" /><span>I independently checked this person’s identity, active registration, licensing body and credential expiry. I understand this grants access to sensitive medical workflows.</span></label>
        <button disabled={saving} className="mt-5 min-h-12 w-full rounded-xl bg-primary px-4 font-extrabold text-white disabled:opacity-50">{saving ? "Recording verification…" : "Verify and activate doctor"}</button>
      </form>
      <section>
        <h2 className="text-lg font-extrabold">Verified clinical accounts</h2>
        <p className="mt-1 text-sm text-slate-500">Availability still requires the doctor to sign in and send a current heartbeat.</p>
        <div className="mt-4 space-y-3">
          {loading ? <OperationsSkeleton rows={4} /> : doctors.length ? doctors.map((doctor) => (
            <article key={doctor.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1b1922]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-lg font-bold text-primary">
                    {doctor.photoURL ? <Image src={doctor.photoURL} alt={`${doctor.professional_name} profile photo`} fill sizes="56px" unoptimized className="object-cover" /> : doctor.professional_name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-extrabold">{doctor.professional_name}</h3><StatusBadge tone={doctor.verification_status === "verified" ? "success" : "danger"}>{doctor.verification_status}</StatusBadge></div>
                    <p className="mt-1 break-words text-sm text-slate-500">{doctor.title} · {doctor.profiles?.email || "Account email protected"}</p>
                    <p className="mt-2 text-xs text-slate-500">{doctor.licensing_body} · {doctor.registration_number} · expires {new Date(doctor.credential_expires_at).toLocaleDateString()}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">Live status: {doctor.status}</p>
                  </div>
                </div>
                <button onClick={() => void update(doctor.id, doctor.verification_status === "verified" ? "suspend" : "restore")} className={`min-h-10 rounded-xl px-4 text-sm font-bold text-white ${doctor.verification_status === "verified" ? "bg-red-700" : "bg-emerald-700"}`}>{doctor.verification_status === "verified" ? "Suspend" : "Restore"}</button>
              </div>
            </article>
          )) : <OperationsNotice>No doctor accounts have been verified yet.</OperationsNotice>}
        </div>
      </section>
    </div>
  </AdminShell>;
}

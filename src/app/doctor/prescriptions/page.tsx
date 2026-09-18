"use client";

import { useCallback, useEffect, useState } from "react";
import DoctorShell from "@/components/doctor/DoctorShell";
import { OperationsEmptyState, OperationsPageHeader, OperationsSkeleton, StatusBadge } from "@/components/operations/OperationsUI";
import { useAuth } from "@/context/AuthContext";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import type { DoctorPrescription } from "@/types";

export default function DoctorPrescriptionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [records, setRecords] = useState<DoctorPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [voidingId, setVoidingId] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const response = await authenticatedFetch("/api/doctor/prescriptions", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Prescription records could not be loaded");
      setRecords(result.data?.prescriptions || []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Prescription records could not be loaded");
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { if (!authLoading && user) void load(); }, [authLoading, load, user]);

  const withdraw = async (prescriptionId: string) => {
    setSaving(true); setError("");
    try {
      const response = await authenticatedFetch("/api/doctor/prescriptions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prescriptionId, reason: voidReason }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Prescription could not be withdrawn");
      setVoidingId(""); setVoidReason(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Prescription could not be withdrawn"); }
    finally { setSaving(false); }
  };

  return <DoctorShell>
    <OperationsPageHeader eyebrow="Clinical records" title="Prescriptions" description="Read-only history of prescriptions you issued after assigned consultations." />
    {error && <p role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</p>}
    {loading ? <div className="mt-6"><OperationsSkeleton rows={4} /></div> : records.length === 0 ? <div className="mt-6"><OperationsEmptyState icon="prescriptions" title="No prescriptions issued" description="Prescriptions created after clinical assessments will appear here." /></div> : <div className="mt-6 space-y-3">{records.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1b1922]"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-extrabold">{item.medicineName} {item.strength}</h2><StatusBadge tone={item.status === "issued" ? "success" : "neutral"}>{item.status}</StatusBadge></div><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.dose} · {item.route} · {item.frequency} · {item.duration}</p><p className="mt-1 text-xs text-slate-500">Quantity: {item.quantity} · Member ref {item.memberId.slice(0, 8)}</p>{item.instructions && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900">{item.instructions}</p>}{item.status === "voided" && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"><strong>Withdrawn:</strong> {item.voidReason || "Contact the member before any further use."}</p>}{item.status === "issued" && (voidingId === item.id ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"><label className="block text-sm font-bold text-red-950">Reason for withdrawal<textarea value={voidReason} onChange={(event) => setVoidReason(event.target.value)} minLength={10} maxLength={500} rows={3} className="mt-2 w-full rounded-xl border-red-300 bg-white text-base" /></label><div className="mt-3 flex gap-2"><button type="button" disabled={saving || voidReason.trim().length < 10} onClick={() => void withdraw(item.id)} className="min-h-11 rounded-xl bg-red-700 px-4 text-sm font-bold text-white disabled:opacity-50">Withdraw and notify member</button><button type="button" disabled={saving} onClick={() => { setVoidingId(""); setVoidReason(""); }} className="min-h-11 rounded-xl border border-red-300 px-4 text-sm font-bold text-red-800">Keep prescription</button></div></div> : <button type="button" onClick={() => setVoidingId(item.id)} className="mt-4 min-h-10 rounded-xl border border-red-300 px-4 text-sm font-bold text-red-700">Withdraw prescription</button>)}</div><time className="text-xs text-slate-400">{new Date(item.issuedAt).toLocaleString()}</time></div></article>)}</div>}
  </DoctorShell>;
}
